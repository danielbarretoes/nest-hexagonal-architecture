import { HttpLog } from './http-log.entity';

describe('HttpLog', () => {
  const baseProps = {
    method: ' post ',
    path: ' /api/v1/users ',
    statusCode: 201,
    requestBody: { email: 'john@example.com' },
    queryParams: { page: '1' },
    routeParams: { id: 'user-1' },
    responseBody: { id: 'user-1' },
    errorMessage: null,
    errorTrace: null,
    durationMs: 12,
    userId: 'user-1',
    organizationId: 'org-1',
    traceId: 'trace-1',
  } as const;

  it('normalizes method and path on create', () => {
    const log = HttpLog.create(baseProps);

    expect(log.method).toBe('POST');
    expect(log.path).toBe('/api/v1/users');
    expect(log.id).toEqual(expect.any(String));
    expect(log.createdAt).toBeInstanceOf(Date);
  });

  it('rehydrates an existing log without changing the identity', () => {
    const createdAt = new Date('2026-03-25T10:00:00.000Z');
    const log = HttpLog.rehydrate({
      id: '6af0a6a7-3f48-4d95-a8b4-02cdb8382d6f',
      createdAt,
      ...baseProps,
    });

    expect(log.id).toBe('6af0a6a7-3f48-4d95-a8b4-02cdb8382d6f');
    expect(log.method).toBe('POST');
    expect(log.path).toBe('/api/v1/users');
    expect(log.createdAt).toBe(createdAt);
  });

  it('rejects missing HTTP methods', () => {
    expect(() =>
      HttpLog.create({
        ...baseProps,
        method: '   ',
      }),
    ).toThrow('HTTP method is required');
  });

  it('rejects missing HTTP paths', () => {
    expect(() =>
      HttpLog.create({
        ...baseProps,
        path: '   ',
      }),
    ).toThrow('HTTP path is required');
  });

  it('rejects invalid status codes', () => {
    expect(() =>
      HttpLog.create({
        ...baseProps,
        statusCode: 99,
      }),
    ).toThrow('Invalid HTTP status code: 99');
  });

  it('rejects negative durations', () => {
    expect(() =>
      HttpLog.create({
        ...baseProps,
        durationMs: -1,
      }),
    ).toThrow('HTTP log duration cannot be negative');
  });
});
