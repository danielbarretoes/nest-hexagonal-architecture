import { JobsRuntimeHealthService } from './jobs-runtime-health.service';

describe('JobsRuntimeHealthService', () => {
  it('checks database readiness and returns the current outbox snapshot', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const inspect = jest.fn().mockResolvedValue({
      counts: {
        pending: 1,
        claimed: 0,
        published: 0,
        completed: 0,
        dead: 0,
        total: 1,
      },
      deadJobs: [],
    });
    const service = new JobsRuntimeHealthService({ query } as never, { inspect } as never);

    const snapshot = await service.getSnapshot(3);

    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(inspect).toHaveBeenCalledWith(3);
    expect(snapshot).toEqual({
      databaseReady: true,
      outbox: {
        counts: {
          pending: 1,
          claimed: 0,
          published: 0,
          completed: 0,
          dead: 0,
          total: 1,
        },
        deadJobs: [],
      },
    });
  });
});
