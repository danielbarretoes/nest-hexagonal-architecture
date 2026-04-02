import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { JobOutboxStatus } from '../../../../domain/entities/job-outbox.entity';

@Entity('job_outbox')
export class JobOutboxTypeOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'job_type', type: 'varchar', length: 128 })
  jobType!: string;

  @Column({ type: 'jsonb' })
  payload!: unknown;

  @Column({ name: 'trace_id', type: 'varchar', length: 128, nullable: true })
  traceId!: string | null;

  @Column({ type: 'varchar', length: 32 })
  status!: JobOutboxStatus;

  @Column({ name: 'attempt_count', type: 'integer' })
  attemptCount!: number;

  @Column({ name: 'next_attempt_at', type: 'timestamptz' })
  nextAttemptAt!: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'group_key', type: 'varchar', length: 128 })
  groupKey!: string;

  @Column({ name: 'deduplication_key', type: 'varchar', length: 255 })
  deduplicationKey!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
