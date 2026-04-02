import { Inject, Injectable } from '@nestjs/common';
import type { JobOutboxStatus } from '../domain/entities/job-outbox.entity';
import type { JobOutboxRepositoryPort } from '../domain/ports/job-outbox.repository.port';
import { JOB_OUTBOX_REPOSITORY_TOKEN } from './ports/job-outbox-repository.token';
import { JOBS_RUNTIME_OPTIONS, type JobsRuntimeOptions } from './ports/jobs-runtime-options.token';

export interface OutboxCleanupResult {
  publishedDeleted: number;
  completedDeleted: number;
  deadDeleted: number;
  totalDeleted: number;
}

export interface OutboxCleanupPreview {
  publishedCandidateIds: readonly string[];
  completedCandidateIds: readonly string[];
  deadCandidateIds: readonly string[];
  totalCandidates: number;
}

@Injectable()
export class OutboxCleanupService {
  constructor(
    @Inject(JOB_OUTBOX_REPOSITORY_TOKEN)
    private readonly jobOutboxRepository: JobOutboxRepositoryPort,
    @Inject(JOBS_RUNTIME_OPTIONS)
    private readonly jobsRuntimeOptions: JobsRuntimeOptions,
  ) {}

  async cleanupOnce(now = new Date()): Promise<OutboxCleanupResult> {
    const publishedDeleted = await this.deleteByStatus('published', now);
    const completedDeleted = await this.deleteByStatus('completed', now);
    const deadDeleted = await this.deleteByStatus('dead', now);

    return {
      publishedDeleted,
      completedDeleted,
      deadDeleted,
      totalDeleted: publishedDeleted + completedDeleted + deadDeleted,
    };
  }

  async previewCleanup(now = new Date()): Promise<OutboxCleanupPreview> {
    const [publishedCandidateIds, completedCandidateIds, deadCandidateIds] = await Promise.all([
      this.previewByStatus('published', now),
      this.previewByStatus('completed', now),
      this.previewByStatus('dead', now),
    ]);

    return {
      publishedCandidateIds,
      completedCandidateIds,
      deadCandidateIds,
      totalCandidates:
        publishedCandidateIds.length + completedCandidateIds.length + deadCandidateIds.length,
    };
  }

  private async deleteByStatus(status: JobOutboxStatus, now: Date): Promise<number> {
    return this.jobOutboxRepository.deleteByStatusOlderThan(
      status,
      this.resolveCutoff(status, now),
      this.jobsRuntimeOptions.outboxCleanupBatchSize,
    );
  }

  private async previewByStatus(status: JobOutboxStatus, now: Date): Promise<readonly string[]> {
    const jobs = await this.jobOutboxRepository.findByStatus(status);

    return [...jobs]
      .filter((job) => job.updatedAt < this.resolveCutoff(status, now))
      .sort((left, right) => left.updatedAt.getTime() - right.updatedAt.getTime())
      .slice(0, this.jobsRuntimeOptions.outboxCleanupBatchSize)
      .map((job) => job.id);
  }

  private resolveCutoff(status: JobOutboxStatus, now: Date): Date {
    const retentionHours =
      status === 'published'
        ? this.jobsRuntimeOptions.outboxRetentionPublishedHours
        : status === 'completed'
          ? this.jobsRuntimeOptions.outboxRetentionCompletedHours
          : this.jobsRuntimeOptions.outboxRetentionDeadHours;

    return new Date(now.getTime() - retentionHours * 60 * 60 * 1000);
  }
}
