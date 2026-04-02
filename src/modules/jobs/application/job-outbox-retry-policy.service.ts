import { Injectable } from '@nestjs/common';
import { getAppConfig } from '../../../config/env/app-config';

@Injectable()
export class JobOutboxRetryPolicyService {
  private readonly jobsConfig = getAppConfig().jobs;

  shouldMarkDead(nextAttemptCount: number): boolean {
    return nextAttemptCount >= this.jobsConfig.outboxMaxAttempts;
  }

  nextAttemptAt(nextAttemptCount: number, now = new Date()): Date {
    const exponentialDelay =
      this.jobsConfig.outboxRetryBaseMs * 2 ** Math.max(nextAttemptCount - 1, 0);
    const delayMs = Math.min(exponentialDelay, this.jobsConfig.outboxRetryMaxMs);

    return new Date(now.getTime() + delayMs);
  }
}
