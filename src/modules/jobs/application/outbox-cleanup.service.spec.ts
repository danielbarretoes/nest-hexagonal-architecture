import { OutboxCleanupService } from './outbox-cleanup.service';
import { JobOutbox } from '../domain/entities/job-outbox.entity';

describe('OutboxCleanupService', () => {
  const deleteByStatusOlderThan = jest.fn();
  const findByStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
    process.env.JOBS_OUTBOX_CLEANUP_BATCH_SIZE = '50';
    process.env.JOBS_OUTBOX_RETENTION_PUBLISHED_HOURS = '24';
    process.env.JOBS_OUTBOX_RETENTION_COMPLETED_HOURS = '48';
    process.env.JOBS_OUTBOX_RETENTION_DEAD_HOURS = '72';
  });

  it('deletes aged rows per terminal status using the configured retention windows', async () => {
    deleteByStatusOlderThan
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);

    const service = new OutboxCleanupService({
      deleteByStatusOlderThan,
      findByStatus,
    } as never);
    const now = new Date('2026-04-01T12:00:00.000Z');

    const result = await service.cleanupOnce(now);

    expect(deleteByStatusOlderThan).toHaveBeenNthCalledWith(
      1,
      'published',
      new Date('2026-03-31T12:00:00.000Z'),
      50,
    );
    expect(deleteByStatusOlderThan).toHaveBeenNthCalledWith(
      2,
      'completed',
      new Date('2026-03-30T12:00:00.000Z'),
      50,
    );
    expect(deleteByStatusOlderThan).toHaveBeenNthCalledWith(
      3,
      'dead',
      new Date('2026-03-29T12:00:00.000Z'),
      50,
    );
    expect(result).toEqual({
      publishedDeleted: 2,
      completedDeleted: 3,
      deadDeleted: 4,
      totalDeleted: 9,
    });
  });

  it('previews terminal rows that would be deleted by cleanup', async () => {
    const oldPublished = JobOutbox.create({
      id: 'job-published',
      type: 'transactional_email',
      payload: { type: 'welcome', to: 'pub@example.com', recipientName: 'Pub' },
      groupKey: 'transactional_email',
      deduplicationKey: 'published-1',
    }).markPublished(new Date('2026-03-01T12:00:00.000Z'));
    const completedTemplate = JobOutbox.create({
      id: 'job-completed',
      type: 'transactional_email',
      payload: { type: 'welcome', to: 'done@example.com', recipientName: 'Done' },
      groupKey: 'transactional_email',
      deduplicationKey: 'completed-1',
    }).markCompleted();
    const oldCompleted = JobOutbox.rehydrate({
      ...completedTemplate,
      updatedAt: new Date('2026-03-29T12:00:00.000Z'),
    });
    const deadTemplate = JobOutbox.create({
      id: 'job-dead',
      type: 'transactional_email',
      payload: { type: 'welcome', to: 'dead@example.com', recipientName: 'Dead' },
      groupKey: 'transactional_email',
      deduplicationKey: 'dead-1',
    }).markDead('dead');
    const oldDead = JobOutbox.rehydrate({
      ...deadTemplate,
      updatedAt: new Date('2026-03-28T12:00:00.000Z'),
    });

    findByStatus
      .mockResolvedValueOnce([oldPublished])
      .mockResolvedValueOnce([oldCompleted])
      .mockResolvedValueOnce([oldDead]);

    const service = new OutboxCleanupService({
      deleteByStatusOlderThan,
      findByStatus,
    } as never);

    const preview = await service.previewCleanup(new Date('2026-04-01T12:00:00.000Z'));

    expect(preview).toEqual({
      publishedCandidateIds: ['job-published'],
      completedCandidateIds: ['job-completed'],
      deadCandidateIds: ['job-dead'],
      totalCandidates: 3,
    });
  });
});
