import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { HttpLogRequest } from '../../../../../common/http/http-log-context';
import { HttpLogsMiddleware } from './http-logs.middleware';

type MockResponse = Response &
  EventEmitter & {
    statusCode: number;
    json: jest.Mock;
    send: jest.Mock;
  };

function createResponse(statusCode = 200): MockResponse {
  const response = new EventEmitter() as MockResponse;

  response.statusCode = statusCode;
  response.json = jest.fn((body?: unknown) => body) as unknown as jest.Mock;
  response.send = jest.fn((body?: unknown) => body) as unknown as jest.Mock;

  return response;
}

describe('HttpLogsMiddleware', () => {
  const execute = jest.fn();
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('captures response payloads and persists a sanitized log entry', async () => {
    const middleware = new HttpLogsMiddleware({
      execute,
    } as never);
    const response = createResponse(200);
    const request = {
      method: 'POST',
      path: '/api/v1/auth/login',
      originalUrl: '/api/v1/auth/login',
      headers: {
        'x-trace-id': 'trace-1',
      },
      body: {
        password: 'secret',
      },
      query: {},
      params: {},
      user: {
        userId: 'user-1',
      },
      effectiveOrganizationId: 'org-1',
    } as HttpLogRequest;
    execute.mockResolvedValue(undefined);
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    middleware.use(request, response, next);
    response.json({ ok: true });
    response.emit('finish');
    await HttpLogsMiddleware.waitForIdle();

    expect(next).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/api/v1/auth/login',
        requestBody: {
          password: '[REDACTED]',
        },
        responseBody: {
          ok: true,
        },
        userId: 'user-1',
        organizationId: 'org-1',
        traceId: 'trace-1',
      }),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('POST /api/v1/auth/login 200'));
  });

  it('logs failed responses and swallows persistence failures', async () => {
    const middleware = new HttpLogsMiddleware({
      execute,
    } as never);
    const response = createResponse(500);
    const request = {
      method: 'GET',
      path: '/api/v1/users/1',
      originalUrl: '/api/v1/users/1',
      headers: {},
      body: null,
      query: {},
      params: {
        id: '1',
      },
      httpLogError: {
        message: 'boom',
        stack: 'stack-line',
      },
    } as HttpLogRequest;
    execute.mockRejectedValue(new Error('write failed'));
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    middleware.use(request, response, next);
    response.send({ status: 'failed' });
    response.emit('finish');
    await HttpLogsMiddleware.waitForIdle();

    expect(errorSpy).toHaveBeenCalledWith('Failed to persist HTTP log: write failed');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('GET /api/v1/users/1 500'));
  });
});
