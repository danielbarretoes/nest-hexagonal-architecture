import { RequestIdempotencyService } from './request-idempotency.service';
import {
  IdempotencyKeyReuseConflictException,
  IdempotencyRequestInProgressException,
} from '../domain/exceptions/idempotency.exceptions';

describe('RequestIdempotencyService', () => {
  const createPending = jest.fn();
  const findById = jest.fn();
  const findByUnique = jest.fn();
  const update = jest.fn();
  const deletePending = jest.fn();

  const repository = {
    findById,
    createPending,
    findByUnique,
    update,
    deletePending,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts a new request when the key was not seen before', async () => {
    createPending.mockResolvedValue({ id: 'request-1' });

    const service = new RequestIdempotencyService(repository as never);
    const result = await service.begin({
      idempotencyKey: 'idem-1',
      scopeKey: 'user:user-1',
      method: 'POST',
      routeKey: '/api/v1/users/self-register',
      requestHash: 'hash-1',
    });

    expect(result).toEqual({
      outcome: 'started',
      requestId: 'request-1',
    });
  });

  it('replays a completed response when the same request arrives again', async () => {
    createPending.mockResolvedValue(null);
    findByUnique.mockResolvedValue({
      requestHash: 'hash-1',
      status: 'completed',
      responseStatusCode: 201,
      responseBody: { id: 'user-1' },
    });

    const service = new RequestIdempotencyService(repository as never);
    const result = await service.begin({
      idempotencyKey: 'idem-1',
      scopeKey: 'user:user-1',
      method: 'POST',
      routeKey: '/api/v1/users/self-register',
      requestHash: 'hash-1',
    });

    expect(result).toEqual({
      outcome: 'replay',
      response: {
        statusCode: 201,
        body: { id: 'user-1' },
      },
    });
  });

  it('rejects a reused key when the payload hash changed', async () => {
    createPending.mockResolvedValue(null);
    findByUnique.mockResolvedValue({
      requestHash: 'hash-1',
      status: 'completed',
      responseStatusCode: 201,
      responseBody: null,
    });

    const service = new RequestIdempotencyService(repository as never);

    await expect(
      service.begin({
        idempotencyKey: 'idem-1',
        scopeKey: 'user:user-1',
        method: 'POST',
        routeKey: '/api/v1/users/self-register',
        requestHash: 'hash-2',
      }),
    ).rejects.toThrow(IdempotencyKeyReuseConflictException);
  });

  it('rejects in-flight requests while the original execution is still pending', async () => {
    createPending.mockResolvedValue(null);
    findByUnique.mockResolvedValue({
      requestHash: 'hash-1',
      status: 'pending',
      responseStatusCode: null,
      responseBody: null,
    });

    const service = new RequestIdempotencyService(repository as never);

    await expect(
      service.begin({
        idempotencyKey: 'idem-1',
        scopeKey: 'user:user-1',
        method: 'POST',
        routeKey: '/api/v1/users/self-register',
        requestHash: 'hash-1',
      }),
    ).rejects.toThrow(IdempotencyRequestInProgressException);
  });

  it('marks pending requests as completed', async () => {
    const completedRequest = { id: 'request-1', status: 'completed' };
    findById.mockResolvedValue({
      id: 'request-1',
      status: 'pending',
      complete: jest.fn().mockReturnValue(completedRequest),
    });

    const service = new RequestIdempotencyService(repository as never);
    await service.complete({
      requestId: 'request-1',
      statusCode: 201,
      body: { ok: true },
    });

    expect(update).toHaveBeenCalledWith(completedRequest);
  });

  it('releases pending requests back to retryable state', async () => {
    const service = new RequestIdempotencyService(repository as never);

    await service.release({ requestId: 'request-1' });

    expect(deletePending).toHaveBeenCalledWith('request-1');
  });
});
