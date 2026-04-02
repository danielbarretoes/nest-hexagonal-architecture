import { JobOutbox } from '../domain/entities/job-outbox.entity';
import { OutboxInspectionService } from './outbox-inspection.service';

describe('OutboxInspectionService', () => {
  const findByStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns outbox counts plus a dead job sample ordered by most recently updated', async () => {
    const olderDeadTemplate = JobOutbox.create({
      id: 'job-dead-1',
      type: 'transactional_email',
      payload: { type: 'welcome', to: 'one@example.com', recipientName: 'One' },
      groupKey: 'transactional_email',
      deduplicationKey: 'dead-1',
    }).markDead('older failure');
    const olderDeadJob = JobOutbox.rehydrate({
      ...olderDeadTemplate,
      updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    });
    const latestDeadTemplate = JobOutbox.create({
      id: 'job-dead-2',
      type: 'transactional_email',
      payload: { type: 'welcome', to: 'two@example.com', recipientName: 'Two' },
      groupKey: 'transactional_email',
      deduplicationKey: 'dead-2',
    }).markDead('latest failure');
    const latestDeadJob = JobOutbox.rehydrate({
      ...latestDeadTemplate,
      updatedAt: new Date('2026-04-01T11:00:00.000Z'),
    });

    findByStatus
      .mockResolvedValueOnce([
        JobOutbox.create({
          id: 'job-pending',
          type: 'transactional_email',
          payload: { type: 'welcome', to: 'pending@example.com', recipientName: 'Pending' },
          groupKey: 'transactional_email',
          deduplicationKey: 'pending-1',
        }),
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([olderDeadJob, latestDeadJob]);

    const service = new OutboxInspectionService({
      findByStatus,
    } as never);

    const snapshot = await service.inspect(1);

    expect(snapshot.counts).toEqual({
      pending: 1,
      claimed: 0,
      published: 0,
      completed: 0,
      dead: 2,
      total: 3,
    });
    expect(snapshot.deadJobs).toHaveLength(1);
    expect(snapshot.deadJobs[0]).toEqual(
      expect.objectContaining({
        id: 'job-dead-2',
        lastError: 'latest failure',
      }),
    );
  });
});
