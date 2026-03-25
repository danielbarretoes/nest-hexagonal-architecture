import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { HttpLogsAccessGuard } from './http-logs-access.guard';
import type { TenantAccessPort } from '../../../../../shared/domain/ports/tenant-access.port';

describe('HttpLogsAccessGuard', () => {
  const hasAccess = jest.fn();
  const tenantAccessPort: TenantAccessPort = {
    hasAccess,
  };

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows privileged tenant members and stores the effective organization id', async () => {
    const guard = new HttpLogsAccessGuard(tenantAccessPort);
    hasAccess.mockResolvedValue(true);

    const request = {
      headers: {
        'x-organization-id': 'org-1',
      },
      user: {
        userId: 'user-1',
        email: 'owner@example.com',
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(hasAccess).toHaveBeenCalledWith('user-1', 'org-1', ['owner', 'admin', 'manager']);
    expect(request.effectiveOrganizationId).toBe('org-1');
  });

  it('rejects access when the authenticated user is missing', async () => {
    const guard = new HttpLogsAccessGuard(tenantAccessPort);
    const request = {
      headers: {
        'x-organization-id': 'org-1',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      'Authenticated user context is required',
    );
  });

  it('rejects access when the tenant header is missing', async () => {
    const guard = new HttpLogsAccessGuard(tenantAccessPort);
    const request = {
      headers: {},
      user: {
        userId: 'user-1',
        email: 'owner@example.com',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      'x-organization-id header is required for http_logs access',
    );
  });

  it('rejects access when the user lacks privileged membership', async () => {
    const guard = new HttpLogsAccessGuard(tenantAccessPort);
    hasAccess.mockResolvedValue(false);

    const request = {
      headers: {
        'x-organization-id': 'org-1',
      },
      user: {
        userId: 'user-1',
        email: 'member@example.com',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      'Insufficient tenant privileges for http_logs access',
    );
  });
});
