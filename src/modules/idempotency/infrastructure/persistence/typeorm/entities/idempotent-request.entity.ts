import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { IdempotentRequestStatus } from '../../../../domain/entities/idempotent-request.entity';

@Entity('idempotency_requests')
@Index('uq_idempotency_requests_scope_key', ['scopeKey', 'idempotencyKey', 'method', 'routeKey'], {
  unique: true,
})
@Index('idx_idempotency_requests_created_at', ['createdAt'])
export class IdempotentRequestTypeOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  idempotencyKey!: string;

  @Column({ type: 'varchar', length: 255 })
  scopeKey!: string;

  @Column({ type: 'varchar', length: 12 })
  method!: string;

  @Column({ type: 'varchar', length: 255 })
  routeKey!: string;

  @Column({ type: 'varchar', length: 128 })
  requestHash!: string;

  @Column({ type: 'varchar', length: 24 })
  status!: IdempotentRequestStatus;

  @Column({ type: 'integer', nullable: true })
  responseStatusCode!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  responseBody!: unknown;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
