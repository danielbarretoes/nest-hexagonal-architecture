import { Inject, Injectable } from '@nestjs/common';
import { JOBS_RUNTIME_OPTIONS, type JobsRuntimeOptions } from './ports/jobs-runtime-options.token';

@Injectable()
export class JobOutboxRetryPolicyService {
  constructor(
    @Inject(JOBS_RUNTIME_OPTIONS)
    private readonly jobsRuntimeOptions: JobsRuntimeOptions,
  ) {}

  shouldMarkDead(nextAttemptCount: number): boolean {
    return nextAttemptCount >= this.jobsRuntimeOptions.outboxMaxAttempts;
  }

  nextAttemptAt(nextAttemptCount: number, now = new Date()): Date {
    const exponentialDelay =
      this.jobsRuntimeOptions.outboxRetryBaseMs * 2 ** Math.max(nextAttemptCount - 1, 0);
    const delayMs = Math.min(exponentialDelay, this.jobsRuntimeOptions.outboxRetryMaxMs);

    return new Date(now.getTime() + delayMs);
  }
}
