import { HttpLog } from '../../domain/entities/http-log.entity';
import type { HttpLogRepositoryPort } from '../../domain/ports/http-log.repository.port';
import { GetHttpLogByIdUseCase } from './get-http-log-by-id.use-case';
import { GetHttpLogsByTraceIdUseCase } from './get-http-logs-by-trace-id.use-case';
import { GetPaginatedHttpLogsUseCase } from './get-paginated-http-logs.use-case';
import { RecordHttpLogUseCase } from './record-http-log.use-case';

describe('HTTP log use cases', () => {
  const save = jest.fn();
  const findById = jest.fn();
  const findByTraceId = jest.fn();
  const findPaginated = jest.fn();

  const repository: HttpLogRepositoryPort = {
    save,
    findById,
    findByTraceId,
    findPaginated,
  };

  const sampleLog = HttpLog.create({
    method: 'GET',
    path: '/api/v1/users',
    statusCode: 200,
    requestBody: null,
    queryParams: { page: '1' },
    routeParams: null,
    responseBody: { ok: true },
    errorMessage: null,
    errorTrace: null,
    durationMs: 4,
    userId: 'user-1',
    organizationId: 'org-1',
    traceId: 'trace-1',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records a new HTTP log through the repository', async () => {
    const useCase = new RecordHttpLogUseCase(repository);

    await useCase.execute({
      method: 'post',
      path: '/api/v1/auth/login',
      statusCode: 200,
      requestBody: { email: 'john@example.com' },
      queryParams: null,
      routeParams: null,
      responseBody: { accessToken: '[REDACTED]' },
      errorMessage: null,
      errorTrace: null,
      durationMs: 8,
      userId: 'user-1',
      organizationId: 'org-1',
      traceId: 'trace-2',
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      path: '/api/v1/auth/login',
      statusCode: 200,
      durationMs: 8,
      userId: 'user-1',
      organizationId: 'org-1',
      traceId: 'trace-2',
    });
  });

  it('retrieves one HTTP log by id', async () => {
    const useCase = new GetHttpLogByIdUseCase(repository);
    findById.mockResolvedValue(sampleLog);

    await expect(useCase.execute(sampleLog.id)).resolves.toBe(sampleLog);
    expect(findById).toHaveBeenCalledWith(sampleLog.id);
  });

  it('retrieves all HTTP logs by trace id', async () => {
    const useCase = new GetHttpLogsByTraceIdUseCase(repository);
    findByTraceId.mockResolvedValue([sampleLog]);

    await expect(useCase.execute('trace-1')).resolves.toEqual([sampleLog]);
    expect(findByTraceId).toHaveBeenCalledWith('trace-1');
  });

  it('retrieves paginated HTTP logs with filters', async () => {
    const useCase = new GetPaginatedHttpLogsUseCase(repository);
    const paginated = {
      items: [sampleLog],
      meta: {
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    const filters = {
      createdFrom: new Date('2026-03-25T00:00:00.000Z'),
      createdTo: new Date('2026-03-25T23:59:59.999Z'),
      statusFamily: '2xx' as const,
    };
    findPaginated.mockResolvedValue(paginated);

    await expect(useCase.execute(1, 10, filters)).resolves.toBe(paginated);
    expect(findPaginated).toHaveBeenCalledWith(1, 10, filters);
  });
});
