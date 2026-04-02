import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('webhook_endpoints')
@Index('idx_webhook_endpoints_organization_created_at', ['organizationId', 'createdAt'])
export class WebhookEndpointTypeOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  organizationId!: string;

  @Column('uuid')
  createdByUserId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 2048 })
  url!: string;

  @Column('text', { array: true })
  events!: string[];

  @Column({ type: 'text' })
  secretCiphertext!: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastDeliveryAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastFailureAt!: Date | null;

  @Column({ type: 'integer', nullable: true })
  lastFailureStatusCode!: number | null;

  @Column({ type: 'text', nullable: true })
  lastFailureMessage!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
