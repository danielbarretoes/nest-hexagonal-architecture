import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('usage_counters')
@Index(
  'uq_usage_counters_metric_bucket',
  ['metricKey', 'bucketStart', 'organizationId', 'apiKeyId', 'routeKey', 'statusCode'],
  { unique: true },
)
@Index('idx_usage_counters_organization_bucket', ['organizationId', 'bucketStart'])
export class UsageCounterTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  metricKey!: string;

  @Column({ type: 'timestamptz' })
  bucketStart!: Date;

  @Column('uuid')
  organizationId!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  apiKeyId!: string;

  @Column({ type: 'varchar', length: 255 })
  routeKey!: string;

  @Column({ type: 'integer' })
  statusCode!: number;

  @Column({ type: 'integer' })
  count!: number;

  @Column({ type: 'timestamptz' })
  lastSeenAt!: Date;
}
