import { Inject, Injectable } from '@nestjs/common';
import type { JobOutbox } from '../domain/entities/job-outbox.entity';
import type { JobOutboxRepositoryPort } from '../domain/ports/job-outbox.repository.port';
import { JOB_OUTBOX_REPOSITORY_TOKEN } from './ports/job-outbox-repository.token';

export interface ReplayDeadJobsCommand {
  ids?: readonly string[];
  limit?: number;
}

@Injectable()
export class OutboxReplayService {
  constructor(
    @Inject(JOB_OUTBOX_REPOSITORY_TOKEN)
    private readonly jobOutboxRepository: JobOutboxRepositoryPort,
  ) {}

  async replayDeadJobs(command: ReplayDeadJobsCommand = {}): Promise<readonly string[]> {
    const now = new Date();

    if (command.ids && command.ids.length > 0) {
      return this.jobOutboxRepository.replayDeadByIds(command.ids, now);
    }

    return this.jobOutboxRepository.replayDeadBatch(command.limit ?? 100, now);
  }

  async previewDeadJobs(command: ReplayDeadJobsCommand = {}): Promise<readonly string[]> {
    const deadJobs = await this.jobOutboxRepository.findByStatus('dead');

    if (command.ids && command.ids.length > 0) {
      const requestedIds = new Set(command.ids);

      return deadJobs.filter((job) => requestedIds.has(job.id)).map((job) => job.id);
    }

    return [...deadJobs]
      .sort((left, right) => left.updatedAt.getTime() - right.updatedAt.getTime())
      .slice(0, command.limit ?? 100)
      .map((job: JobOutbox) => job.id);
  }
}
