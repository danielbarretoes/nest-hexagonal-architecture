import {
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  type CanActivate,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { API_KEY_AUTHENTICATOR_PORT } from '../../../api-keys/application/ports/api-key-authenticator.token';
import type { ApiKeyAuthenticatorPort } from '../../../api-keys/application/ports/api-key-authenticator.port';
import { JWT_TOKEN_PORT } from '../../application/ports/jwt-token.token';
import type { JwtTokenPort } from '../../domain/ports';
import type { AuthenticatedHttpRequest } from '../../../../../common/http/authenticated-request';

@Injectable()
export class AccessAuthGuard implements CanActivate {
  constructor(
    @Inject(JWT_TOKEN_PORT)
    private readonly jwtTokenPort: JwtTokenPort,
    @Inject(API_KEY_AUTHENTICATOR_PORT)
    private readonly apiKeyAuthenticator: ApiKeyAuthenticatorPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedHttpRequest>();
    const bearerToken = this.extractBearerToken(request);

    if (bearerToken) {
      const payload = this.jwtTokenPort.verifyToken(bearerToken);

      if (!payload) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      request.user = {
        ...payload,
        authMethod: 'jwt',
      };
      return true;
    }

    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('Missing authentication token');
    }

    const authenticatedApiKey = await this.apiKeyAuthenticator.authenticate(
      apiKey,
      this.extractRemoteIp(request),
    );

    if (!authenticatedApiKey) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    const organizationHeader = request.headers['x-organization-id'];
    const requestedOrganizationId =
      typeof organizationHeader === 'string' ? organizationHeader.trim() : '';

    if (requestedOrganizationId && requestedOrganizationId !== authenticatedApiKey.organizationId) {
      throw new ForbiddenException('API key cannot be used outside its bound organization');
    }

    request.user = {
      userId: authenticatedApiKey.userId,
      email: authenticatedApiKey.email,
      authMethod: 'api_key',
      organizationId: authenticatedApiKey.organizationId,
      apiKeyId: authenticatedApiKey.apiKeyId,
      apiKeyName: authenticatedApiKey.apiKeyName,
      apiKeyScopes: authenticatedApiKey.scopes,
    };
    request.effectiveOrganizationId = authenticatedApiKey.organizationId;

    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private extractApiKey(request: Request): string | undefined {
    const apiKeyHeader = request.headers['x-api-key'];

    if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim().length > 0) {
      return apiKeyHeader.trim();
    }

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'ApiKey' ? token : undefined;
  }

  private extractRemoteIp(request: Request): string | null {
    if (typeof request.ip === 'string' && request.ip.length > 0) {
      return request.ip;
    }

    const forwardedFor = request.headers['x-forwarded-for'];
    const firstForwarded =
      typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : null;

    return firstForwarded || null;
  }
}
