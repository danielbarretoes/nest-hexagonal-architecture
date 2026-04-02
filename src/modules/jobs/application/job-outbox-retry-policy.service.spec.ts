import { JobOutboxRetryPolicyService } from './job-outbox-retry-policy.service';

describe('JobOutboxRetryPolicyService', () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    JOBS_OUTBOX_MAX_ATTEMPTS: process.env.JOBS_OUTBOX_MAX_ATTEMPTS,
    JOBS_OUTBOX_RETRY_BASE_MS: process.env.JOBS_OUTBOX_RETRY_BASE_MS,
    JOBS_OUTBOX_RETRY_MAX_MS: process.env.JOBS_OUTBOX_RETRY_MAX_MS,
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.JOBS_OUTBOX_MAX_ATTEMPTS = '8';
    process.env.JOBS_OUTBOX_RETRY_BASE_MS = '1000';
    process.env.JOBS_OUTBOX_RETRY_MAX_MS = '60000';
  });

  afterAll(() => {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
        return;
      }

      process.env[key] = value;
    });
  });

  it('computes exponential delays capped by the configured maximum', () => {
    const service = new JobOutboxRetryPolicyService();
    const now = new Date('2026-04-01T00:00:00.000Z');

    expect(service.nextAttemptAt(1, now).getTime() - now.getTime()).toBe(1000);
    expect(service.nextAttemptAt(2, now).getTime() - now.getTime()).toBe(2000);
    expect(service.nextAttemptAt(10, now).getTime() - now.getTime()).toBe(60000);
  });

  it('marks jobs as dead once the max attempts threshold is reached', () => {
    const service = new JobOutboxRetryPolicyService();

    expect(service.shouldMarkDead(7)).toBe(false);
    expect(service.shouldMarkDead(8)).toBe(true);
  });
});
