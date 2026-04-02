import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('job_execution_receipts')
export class JobExecutionReceiptTypeOrmEntity {
  @PrimaryColumn({ name: 'job_id', type: 'uuid' })
  jobId!: string;

  @PrimaryColumn({ type: 'varchar', length: 128 })
  handler!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
