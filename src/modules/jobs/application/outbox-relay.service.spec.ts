import { JobOutboxRetryPolicyService } from './job-outbox-retry-policy.service';
import { OutboxRelayService } from './outbox-relay.service';
import { JobOutbox } from '../domain/entities/job-outbox.entity';
import type { JobsRuntimeOptions } from './ports/jobs-runtime-options.token';

describe('OutboxRelayService', () => {
  const findById = jest.fn();
  const claimPendingBatch = jest.fn();
  const update = jest.fn();
  const publish = jest.fn();
  const jobsRuntimeOptions: JobsRuntimeOptions = {
    outboxMaxAttempts: 8,
    outboxRetryBaseMs: 1000,
    outboxRetryMaxMs: 60_000,
    outboxCleanupBatchSize: 50,
    outboxRetentionPublishedHours: 24,
    outboxRetentionCompletedHours: 48,
    outboxRetentionDeadHours: 72,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes claimed jobs and marks them as published', async () => {
    const job = JobOutbox.create({
      id: 'job-1',
      type: 'transactional_email',
      payload: { type: 'welcome', to: 'owner@example.com', recipientName: 'Owner' },
      traceId: 'trace-1',
      groupKey: 'transactional_email',
      deduplicationKey: 'dedupe-1',
    }).markClaimed();
    const jobOutboxRepository = {
      findById,
      findByStatus: jest.fn(),
      claimPendingBatch,
      create: jest.fn(),
      update,
    };
    const asyncJobTransport = {
      publish,
    };
    const service = new OutboxRelayService(
      jobOutboxRepository as never,
      asyncJobTransport,
      new JobOutboxRetryPolicyService(jobsRuntimeOptions),
    );

    findById.mockResolvedValue(job);
    publish.mockResolvedValue(undefined);
    update.mockImplementation(async (updatedJob: JobOutbox) => updatedJob);

    await service.dispatchClaimedJob(job.id);

    expect(publish).toHaveBeenCalledWith({
      envelope: expect.objectContaining({
        jobId: 'job-1',
        type: 'transactional_email',
      }),
      groupKey: 'transactional_email',
      deduplicationKey: 'dedupe-1',
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'job-1',
        status: 'published',
      }),
    );
  });

  it('reschedules failed publishes before the max attempts threshold', async () => {
    const job = JobOutbox.create({
      id: 'job-2',
      type: 'transactional_email',
      payload: { type: 'welcome', to: 'owner@example.com', recipientName: 'Owner' },
      groupKey: 'transactional_email',
      deduplicationKey: 'dedupe-2',
    }).markClaimed();
    const service = new OutboxRelayService(
      {
        findById,
        findByStatus: jest.fn(),
        claimPendingBatch,
        create: jest.fn(),
        update,
      } as never,
      { publish } as never,
      new JobOutboxRetryPolicyService(jobsRuntimeOptions),
    );

    findById.mockResolvedValue(job);
    publish.mockRejectedValue(new Error('SQS unavailable'));
    update.mockImplementation(async (updatedJob: JobOutbox) => updatedJob);

    await service.dispatchClaimedJob(job.id);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'job-2',
        status: 'pending',
        attemptCount: 1,
        lastError: 'SQS unavailable',
      }),
    );
  });
});
