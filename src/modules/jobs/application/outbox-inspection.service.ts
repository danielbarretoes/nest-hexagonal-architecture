import { Inject, Injectable } from '@nestjs/common';
import type { JobOutbox, JobOutboxStatus } from '../domain/entities/job-outbox.entity';
import type { JobOutboxRepositoryPort } from '../domain/ports/job-outbox.repository.port';
import { JOB_OUTBOX_REPOSITORY_TOKEN } from './ports/job-outbox-repository.token';

export interface OutboxDeadJobSummary {
  id: string;
  type: string;
  attemptCount: number;
  lastError: string | null;
  updatedAt: string;
}

export interface OutboxInspectionSnapshot {
  counts: Record<JobOutboxStatus, number> & { total: number };
  deadJobs: OutboxDeadJobSummary[];
}

@Injectable()
export class OutboxInspectionService {
  constructor(
    @Inject(JOB_OUTBOX_REPOSITORY_TOKEN)
    private readonly jobOutboxRepository: JobOutboxRepositoryPort,
  ) {}

  async inspect(deadLimit = 10): Promise<OutboxInspectionSnapshot> {
    const [pending, claimed, published, completed, dead] = await Promise.all([
      this.jobOutboxRepository.findByStatus('pending'),
      this.jobOutboxRepository.findByStatus('claimed'),
      this.jobOutboxRepository.findByStatus('published'),
      this.jobOutboxRepository.findByStatus('completed'),
      this.jobOutboxRepository.findByStatus('dead'),
    ]);
    const orderedDeadJobs = [...dead]
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, deadLimit)
      .map((job) => this.toDeadJobSummary(job));

    return {
      counts: {
        pending: pending.length,
        claimed: claimed.length,
        published: published.length,
        completed: completed.length,
        dead: dead.length,
        total: pending.length + claimed.length + published.length + completed.length + dead.length,
      },
      deadJobs: orderedDeadJobs,
    };
  }

  private toDeadJobSummary(job: JobOutbox): OutboxDeadJobSummary {
    return {
      id: job.id,
      type: job.type,
      attemptCount: job.attemptCount,
      lastError: job.lastError,
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
