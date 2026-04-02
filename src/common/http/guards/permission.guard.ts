import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTHORIZATION_PORT } from '../../../shared/application/ports/authorization.token';
import type { PermissionCode } from '../../../shared/domain/authorization/permission-codes';
import type { AuthorizationPort } from '../../../shared/domain/ports/authorization.port';
import type { AuthenticatedHttpRequest } from '../authenticated-request';
import { REQUIRED_PERMISSIONS_METADATA_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTHORIZATION_PORT)
    private readonly authorizationPort: AuthorizationPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<PermissionCode[]>(REQUIRED_PERMISSIONS_METADATA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedHttpRequest>();
    const organizationHeader = request.headers['x-organization-id'];
    const organizationIdFromHeader =
      typeof organizationHeader === 'string' ? organizationHeader.trim() : undefined;
    const organizationId = organizationIdFromHeader || request.effectiveOrganizationId;

    if (!request.user) {
      throw new ForbiddenException('Authenticated user context is required');
    }

    if (
      request.user.authMethod === 'api_key' &&
      organizationIdFromHeader &&
      request.user.organizationId &&
      organizationIdFromHeader !== request.user.organizationId
    ) {
      throw new ForbiddenException('API key cannot be used outside its bound organization');
    }

    if (!organizationId) {
      throw new ForbiddenException('x-organization-id header is required for permission checks');
    }

    for (const permissionCode of requiredPermissions) {
      const hasPermission = await this.authorizationPort.hasPermission(
        request.user.userId,
        organizationId,
        permissionCode,
      );

      if (!hasPermission) {
        throw new ForbiddenException(`Missing required permission: ${permissionCode}`);
      }

      if (
        request.user.authMethod === 'api_key' &&
        request.user.apiKeyScopes &&
        !request.user.apiKeyScopes.includes(permissionCode)
      ) {
        throw new ForbiddenException(`Missing required permission: ${permissionCode}`);
      }
    }

    request.effectiveOrganizationId = organizationId;
    return true;
  }
}
