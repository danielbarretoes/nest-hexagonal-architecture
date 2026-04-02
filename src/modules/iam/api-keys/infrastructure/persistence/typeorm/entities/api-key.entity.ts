import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserTypeOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.entity';
import { OrganizationTypeOrmEntity } from '../../../../../organizations/infrastructure/persistence/typeorm/entities/organization.entity';

@Entity('api_keys')
@Index('idx_api_keys_owner_organization_created_at', ['ownerUserId', 'organizationId', 'createdAt'])
@Index('idx_api_keys_organization', ['organizationId'])
@Index('idx_api_keys_revoked_at', ['revokedAt'])
export class ApiKeyTypeOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  organizationId!: string;

  @ManyToOne(() => OrganizationTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationTypeOrmEntity;

  @Column('uuid')
  ownerUserId!: string;

  @ManyToOne(() => UserTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser!: UserTypeOrmEntity;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 64 })
  keyPrefix!: string;

  @Column({ type: 'varchar', length: 128 })
  secretHash!: string;

  @Column({ type: 'jsonb' })
  scopes!: string[];

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastUsedIp!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
