import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { RequestIdempotencyInterceptor } from './request-idempotency.interceptor';

function observableToPromise<T>(observable: ReturnType<CallHandler<T>['handle']>): Promise<T> {
  return new Promise((resolve, reject) => observable.subscribe({ next: resolve, error: reject }));
}

describe('RequestIdempotencyInterceptor', () => {
  const getAllAndOverride = jest.fn();
  const begin = jest.fn();
  const complete = jest.fn();
  const release = jest.fn();

  const reflector = { getAllAndOverride } as unknown as Reflector;
  const requestIdempotency = { begin, complete, release };

  const createResponse = () => ({
    statusCode: 201,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
  });

  const createContext = (request: Record<string, unknown>, response = createResponse()) =>
    ({
      getType: () => 'http',
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes through requests when the route is not idempotent', async () => {
    getAllAndOverride.mockReturnValue(false);
    const interceptor = new RequestIdempotencyInterceptor(reflector, requestIdempotency as never);
    const next = { handle: () => of({ ok: true }) } as CallHandler;

    const observable = await interceptor.intercept(createContext({ headers: {} }), next);

    await expect(observableToPromise(observable)).resolves.toEqual({ ok: true });
    expect(begin).not.toHaveBeenCalled();
  });

  it('passes through when no idempotency key header is provided', async () => {
    getAllAndOverride.mockReturnValue(true);
    const interceptor = new RequestIdempotencyInterceptor(reflector, requestIdempotency as never);
    const next = { handle: () => of({ ok: true }) } as CallHandler;

    const observable = await interceptor.intercept(
      createContext({ headers: {}, method: 'POST', path: '/users' }),
      next,
    );

    await expect(observableToPromise(observable)).resolves.toEqual({ ok: true });
    expect(begin).not.toHaveBeenCalled();
  });

  it('replays a completed response without executing the handler again', async () => {
    getAllAndOverride.mockReturnValue(true);
    begin.mockResolvedValue({
      outcome: 'replay',
      response: {
        statusCode: 201,
        body: { id: 'user-1' },
      },
    });
    const interceptor = new RequestIdempotencyInterceptor(reflector, requestIdempotency as never);
    const response = createResponse();

    const observable = await interceptor.intercept(
      createContext(
        {
          headers: { 'idempotency-key': 'idem-1' },
          method: 'POST',
          baseUrl: '/api/v1/users',
          route: { path: '/self-register' },
          body: { email: 'john@example.com' },
          params: {},
          query: {},
        },
        response,
      ),
      { handle: jest.fn() } as never,
    );

    await expect(observableToPromise(observable)).resolves.toEqual({ id: 'user-1' });
    expect(response.statusCode).toBe(201);
    expect(response.headers['Idempotency-Replayed']).toBe('true');
  });

  it('completes newly started requests after the handler succeeds', async () => {
    getAllAndOverride.mockReturnValue(true);
    begin.mockResolvedValue({
      outcome: 'started',
      requestId: 'request-1',
    });
    complete.mockResolvedValue(undefined);

    const interceptor = new RequestIdempotencyInterceptor(reflector, requestIdempotency as never);
    const observable = await interceptor.intercept(
      createContext({
        headers: { 'idempotency-key': 'idem-1' },
        method: 'POST',
        baseUrl: '/api/v1/users',
        route: { path: '/self-register' },
        body: { email: 'john@example.com' },
        params: {},
        query: {},
      }),
      { handle: () => of({ id: 'user-1' }) } as CallHandler,
    );

    await expect(observableToPromise(observable)).resolves.toEqual({ id: 'user-1' });
    expect(complete).toHaveBeenCalledWith({
      requestId: 'request-1',
      statusCode: 201,
      body: { id: 'user-1' },
    });
  });

  it('releases the pending key when the handler fails', async () => {
    getAllAndOverride.mockReturnValue(true);
    begin.mockResolvedValue({
      outcome: 'started',
      requestId: 'request-1',
    });
    release.mockResolvedValue(undefined);

    const interceptor = new RequestIdempotencyInterceptor(reflector, requestIdempotency as never);
    const observable = await interceptor.intercept(
      createContext({
        headers: { 'idempotency-key': 'idem-1' },
        method: 'POST',
        baseUrl: '/api/v1/users',
        route: { path: '/self-register' },
        body: { email: 'john@example.com' },
        params: {},
        query: {},
      }),
      { handle: () => throwError(() => new Error('boom')) } as CallHandler,
    );

    await expect(observableToPromise(observable)).rejects.toThrow('boom');
    expect(release).toHaveBeenCalledWith({ requestId: 'request-1' });
  });
});
