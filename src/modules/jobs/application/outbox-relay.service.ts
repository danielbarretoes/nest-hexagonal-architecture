import { Inject, Injectable } from '@nestjs/common';
import type { AsyncJobTransportPort } from './ports/async-job-transport.port';
import { ASYNC_JOB_TRANSPORT_PORT } from './ports/async-job-transport.token';
import { JOB_OUTBOX_REPOSITORY_TOKEN } from './ports/job-outbox-repository.token';
import type { JobOutboxRepositoryPort } from '../domain/ports/job-outbox.repository.port';
import { JobOutboxRetryPolicyService } from './job-outbox-retry-policy.service';

@Injectable()
export class OutboxRelayService {
  constructor(
    @Inject(JOB_OUTBOX_REPOSITORY_TOKEN)
    private readonly jobOutboxRepository: JobOutboxRepositoryPort,
    @Inject(ASYNC_JOB_TRANSPORT_PORT)
    private readonly asyncJobTransport: AsyncJobTransportPort,
    private readonly retryPolicy: JobOutboxRetryPolicyService,
  ) {}

  async claimPendingBatch(limit: number): Promise<readonly string[]> {
    const claimedJobs = await this.jobOutboxRepository.claimPendingBatch(limit, new Date());

    return claimedJobs.map((job) => job.id);
  }

  async dispatchClaimedJob(jobId: string): Promise<void> {
    const job = await this.jobOutboxRepository.findById(jobId);

    if (!job || job.status !== 'claimed') {
      return;
    }

    try {
      await this.asyncJobTransport.publish({
        envelope: job.toEnvelope(),
        groupKey: job.groupKey,
        deduplicationKey: job.deduplicationKey,
      });
      await this.jobOutboxRepository.update(job.markPublished());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown async transport publish error';
      const nextAttemptCount = job.attemptCount + 1;

      if (this.retryPolicy.shouldMarkDead(nextAttemptCount)) {
        await this.jobOutboxRepository.update(job.markDead(errorMessage));
        return;
      }

      await this.jobOutboxRepository.update(
        job.scheduleRetry(errorMessage, this.retryPolicy.nextAttemptAt(nextAttemptCount)),
      );
    }
  }
}
