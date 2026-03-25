import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { TENANT_ACCESS_PORT } from '../../../../../shared/application/ports/tenant-access.token';
import type { TenantAccessPort } from '../../../../../shared/domain/ports/tenant-access.port';
import type { AuthenticatedHttpRequest } from '../../../../../common/http/authenticated-request';

const HTTP_LOGS_ALLOWED_ROLES = ['owner', 'admin', 'manager'] as const;

interface HttpLogsAccessRequest extends AuthenticatedHttpRequest {
  effectiveOrganizationId?: string;
}

@Injectable()
export class HttpLogsAccessGuard implements CanActivate {
  constructor(
    @Inject(TENANT_ACCESS_PORT)
    private readonly tenantAccessPort: TenantAccessPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HttpLogsAccessRequest>();
    const organizationHeader = request.headers['x-organization-id'];
    const organizationId =
      typeof organizationHeader === 'string' ? organizationHeader.trim() : undefined;

    if (!request.user) {
      throw new ForbiddenException('Authenticated user context is required');
    }

    if (!organizationId) {
      throw new ForbiddenException('x-organization-id header is required for http_logs access');
    }

    const hasAccess = await this.tenantAccessPort.hasAccess(
      request.user.userId,
      organizationId,
      HTTP_LOGS_ALLOWED_ROLES,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Insufficient tenant privileges for http_logs access');
    }

    request.effectiveOrganizationId = organizationId;
    return true;
  }
}
