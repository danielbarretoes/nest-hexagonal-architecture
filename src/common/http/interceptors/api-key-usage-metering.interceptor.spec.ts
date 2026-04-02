import { BadRequestException, CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ApiKeyUsageMeteringInterceptor } from './api-key-usage-metering.interceptor';

function observableToPromise<T>(observable: ReturnType<CallHandler<T>['handle']>): Promise<T> {
  return new Promise((resolve, reject) => observable.subscribe({ next: resolve, error: reject }));
}

describe('ApiKeyUsageMeteringInterceptor', () => {
  const record = jest.fn();
  const usageMeter = { record };

  const createContext = (request: Record<string, unknown>, response = { statusCode: 200 }) =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    record.mockResolvedValue(undefined);
  });

  it('skips non-api-key requests', async () => {
    const interceptor = new ApiKeyUsageMeteringInterceptor(usageMeter as never);
    const observable = interceptor.intercept(
      createContext({
        headers: {},
        user: {
          authMethod: 'jwt',
        },
      }),
      { handle: () => of({ ok: true }) } as CallHandler,
    );

    await expect(observableToPromise(observable)).resolves.toEqual({ ok: true });
    expect(record).not.toHaveBeenCalled();
  });

  it('records successful API key traffic with the resolved route key', async () => {
    const interceptor = new ApiKeyUsageMeteringInterceptor(usageMeter as never);
    const observable = interceptor.intercept(
      createContext(
        {
          headers: { 'x-trace-id': 'trace-1' },
          baseUrl: '/api/v1/members',
          route: { path: '' },
          user: {
            authMethod: 'api_key',
            userId: 'user-1',
            organizationId: 'org-1',
            apiKeyId: 'key-1',
          },
        },
        { statusCode: 204 },
      ),
      { handle: () => of(undefined) } as CallHandler,
    );

    await expect(observableToPromise(observable)).resolves.toBeUndefined();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        metricKey: 'api_key.request',
        organizationId: 'org-1',
        apiKeyId: 'key-1',
        routeKey: '/api/v1/members',
        statusCode: 204,
        traceId: 'trace-1',
      }),
    );
  });

  it('records failed API key traffic with the exception status code', async () => {
    const interceptor = new ApiKeyUsageMeteringInterceptor(usageMeter as never);
    const observable = interceptor.intercept(
      createContext({
        headers: {},
        baseUrl: '/api/v1/members',
        route: { path: '' },
        user: {
          authMethod: 'api_key',
          userId: 'user-1',
          organizationId: 'org-1',
          apiKeyId: 'key-1',
        },
      }),
      { handle: () => throwError(() => new BadRequestException('bad')) } as CallHandler,
    );

    await expect(observableToPromise(observable)).rejects.toThrow(BadRequestException);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
  });

  it('does not fail a successful request when metering storage is unavailable', async () => {
    record.mockRejectedValue(new Error('usage storage unavailable'));

    const interceptor = new ApiKeyUsageMeteringInterceptor(usageMeter as never);
    const observable = interceptor.intercept(
      createContext(
        {
          headers: {},
          baseUrl: '/api/v1/members',
          route: { path: '' },
          user: {
            authMethod: 'api_key',
            userId: 'user-1',
            organizationId: 'org-1',
            apiKeyId: 'key-1',
          },
        },
        { statusCode: 200 },
      ),
      { handle: () => of({ ok: true }) } as CallHandler,
    );

    await expect(observableToPromise(observable)).resolves.toEqual({ ok: true });
  });

  it('preserves the original application error when metering storage is unavailable', async () => {
    record.mockRejectedValue(new Error('usage storage unavailable'));

    const interceptor = new ApiKeyUsageMeteringInterceptor(usageMeter as never);
    const observable = interceptor.intercept(
      createContext({
        headers: {},
        baseUrl: '/api/v1/members',
        route: { path: '' },
        user: {
          authMethod: 'api_key',
          userId: 'user-1',
          organizationId: 'org-1',
          apiKeyId: 'key-1',
        },
      }),
      { handle: () => throwError(() => new BadRequestException('bad')) } as CallHandler,
    );

    await expect(observableToPromise(observable)).rejects.toThrow(BadRequestException);
  });
});
