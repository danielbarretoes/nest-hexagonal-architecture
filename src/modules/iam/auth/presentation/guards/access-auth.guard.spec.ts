import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AccessAuthGuard } from './access-auth.guard';
import type { JwtTokenPort } from '../../domain/ports';
import type { ApiKeyAuthenticatorPort } from '../../../api-keys/application/ports/api-key-authenticator.port';

describe('AccessAuthGuard', () => {
  const verifyToken = jest.fn();
  const authenticateApiKey = jest.fn();
  const jwtTokenPort: JwtTokenPort = {
    generateToken: jest.fn(),
    verifyToken,
  };
  const apiKeyAuthenticator: ApiKeyAuthenticatorPort = {
    authenticate: authenticateApiKey,
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

  it('authenticates bearer tokens before falling back to API keys', async () => {
    const guard = new AccessAuthGuard(jwtTokenPort, apiKeyAuthenticator);
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    verifyToken.mockReturnValue({
      userId: 'user-1',
      email: 'owner@example.com',
    });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(authenticateApiKey).not.toHaveBeenCalled();
    expect(request.user).toEqual({
      userId: 'user-1',
      email: 'owner@example.com',
      authMethod: 'jwt',
    });
  });

  it('authenticates valid API keys and binds the tenant context', async () => {
    const guard = new AccessAuthGuard(jwtTokenPort, apiKeyAuthenticator);
    const request = {
      headers: {
        'x-api-key': 'hex_test_key.secret',
      },
      ip: '127.0.0.1',
    };

    authenticateApiKey.mockResolvedValue({
      userId: 'user-1',
      email: 'owner@example.com',
      organizationId: 'org-1',
      apiKeyId: 'key-1',
      apiKeyName: 'Sync key',
      scopes: ['iam.users.read'],
    });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(authenticateApiKey).toHaveBeenCalledWith('hex_test_key.secret', '127.0.0.1');
    expect(request.user).toEqual({
      userId: 'user-1',
      email: 'owner@example.com',
      authMethod: 'api_key',
      organizationId: 'org-1',
      apiKeyId: 'key-1',
      apiKeyName: 'Sync key',
      apiKeyScopes: ['iam.users.read'],
    });
    expect(request.effectiveOrganizationId).toBe('org-1');
  });

  it('rejects API keys used with a mismatched tenant header', async () => {
    const guard = new AccessAuthGuard(jwtTokenPort, apiKeyAuthenticator);
    const request = {
      headers: {
        'x-api-key': 'hex_test_key.secret',
        'x-organization-id': 'other-org',
      },
    };

    authenticateApiKey.mockResolvedValue({
      userId: 'user-1',
      email: 'owner@example.com',
      organizationId: 'org-1',
      apiKeyId: 'key-1',
      apiKeyName: 'Sync key',
      scopes: ['iam.users.read'],
    });

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      'API key cannot be used outside its bound organization',
    );
  });

  it('rejects requests without any supported auth mechanism', async () => {
    const guard = new AccessAuthGuard(jwtTokenPort, apiKeyAuthenticator);
    const request = {
      headers: {},
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      'Missing authentication token',
    );
  });
});
