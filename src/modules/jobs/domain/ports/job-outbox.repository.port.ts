import type { JobOutbox } from '../entities/job-outbox.entity';
import type { JobOutboxStatus } from '../entities/job-outbox.entity';

export interface JobOutboxRepositoryPort {
  findById(id: string): Promise<JobOutbox | null>;
  findByIdForUpdate(id: string): Promise<JobOutbox | null>;
  findByStatus(status: JobOutboxStatus): Promise<JobOutbox[]>;
  create(jobOutbox: JobOutbox): Promise<JobOutbox>;
  claimPendingBatch(limit: number, now: Date): Promise<JobOutbox[]>;
  replayDeadBatch(limit: number, now: Date): Promise<readonly string[]>;
  replayDeadByIds(ids: readonly string[], now: Date): Promise<readonly string[]>;
  deleteByStatusOlderThan(status: JobOutboxStatus, olderThan: Date, limit: number): Promise<number>;
  update(jobOutbox: JobOutbox): Promise<JobOutbox>;
}
