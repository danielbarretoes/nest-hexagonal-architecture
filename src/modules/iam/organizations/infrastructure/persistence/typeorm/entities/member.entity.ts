/**
 * Member TypeORM Entity
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { UserTypeOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.entity';
import { OrganizationTypeOrmEntity } from './organization.entity';
import { MEMBERSHIP_ROLE_NAMES } from '../../../../domain/value-objects/membership-role.value-object';

@Entity('members')
@Unique('uq_members_user_organization', ['userId', 'organizationId'])
@Index('idx_members_organization', ['organizationId'])
@Index('idx_members_user', ['userId'])
export class MemberTypeOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => UserTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserTypeOrmEntity;

  @Column('uuid')
  organizationId!: string;

  @ManyToOne(() => OrganizationTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationTypeOrmEntity;

  @Column({
    type: 'varchar',
    length: 32,
  })
  role!: (typeof MEMBERSHIP_ROLE_NAMES)[number];

  @CreateDateColumn()
  joinedAt!: Date;
}
