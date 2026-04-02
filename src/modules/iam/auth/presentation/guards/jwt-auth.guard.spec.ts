import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtTokenPort } from '../../domain/ports';

describe('JwtAuthGuard', () => {
  const verifyToken = jest.fn();
  const jwtTokenPort: JwtTokenPort = {
    generateToken: jest.fn(),
    verifyToken,
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

  it('authenticates the request when the bearer token is valid', () => {
    const guard = new JwtAuthGuard(jwtTokenPort);
    const payload = {
      userId: 'user-1',
      email: 'john@example.com',
    };
    verifyToken.mockReturnValue(payload);

    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    const canActivate = guard.canActivate(createContext(request));

    expect(canActivate).toBe(true);
    expect(verifyToken).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual({
      ...payload,
      authMethod: 'jwt',
    });
  });

  it('rejects requests without an authorization header', () => {
    const guard = new JwtAuthGuard(jwtTokenPort);
    const request = {
      headers: {},
    };

    expect(() => guard.canActivate(createContext(request))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(createContext(request))).toThrow('Missing authentication token');
  });

  it('rejects requests with a non-bearer authorization header', () => {
    const guard = new JwtAuthGuard(jwtTokenPort);
    const request = {
      headers: {
        authorization: 'Basic abc123',
      },
    };

    expect(() => guard.canActivate(createContext(request))).toThrow(UnauthorizedException);
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('rejects requests when the token cannot be verified', () => {
    const guard = new JwtAuthGuard(jwtTokenPort);
    verifyToken.mockReturnValue(null);

    const request = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    };

    expect(() => guard.canActivate(createContext(request))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(createContext(request))).toThrow('Invalid or expired token');
  });
});
