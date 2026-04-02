import { JobOutboxRetryPolicyService } from './job-outbox-retry-policy.service';
import type { JobsRuntimeOptions } from './ports/jobs-runtime-options.token';

describe('JobOutboxRetryPolicyService', () => {
  const jobsRuntimeOptions: JobsRuntimeOptions = {
    outboxMaxAttempts: 8,
    outboxRetryBaseMs: 1000,
    outboxRetryMaxMs: 60_000,
    outboxCleanupBatchSize: 50,
    outboxRetentionPublishedHours: 24,
    outboxRetentionCompletedHours: 48,
    outboxRetentionDeadHours: 72,
  };

  it('computes exponential delays capped by the configured maximum', () => {
    const service = new JobOutboxRetryPolicyService(jobsRuntimeOptions);
    const now = new Date('2026-04-01T00:00:00.000Z');

    expect(service.nextAttemptAt(1, now).getTime() - now.getTime()).toBe(1000);
    expect(service.nextAttemptAt(2, now).getTime() - now.getTime()).toBe(2000);
    expect(service.nextAttemptAt(10, now).getTime() - now.getTime()).toBe(60000);
  });

  it('marks jobs as dead once the max attempts threshold is reached', () => {
    const service = new JobOutboxRetryPolicyService(jobsRuntimeOptions);

    expect(service.shouldMarkDead(7)).toBe(false);
    expect(service.shouldMarkDead(8)).toBe(true);
  });
});
