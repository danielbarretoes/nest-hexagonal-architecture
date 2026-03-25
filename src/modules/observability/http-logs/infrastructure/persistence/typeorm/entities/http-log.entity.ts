import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import type { JsonValue } from '../../../../domain/entities/http-log.entity';

@Entity('http_logs')
@Index('idx_http_logs_created_at', ['createdAt'])
@Index('idx_http_logs_status_code', ['statusCode'])
@Index('idx_http_logs_user_id', ['userId'])
@Index('idx_http_logs_organization_id', ['organizationId'])
@Index('idx_http_logs_trace_id', ['traceId'])
export class HttpLogTypeOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ length: 16 })
  method!: string;

  @Column({ length: 512 })
  path!: string;

  @Column('int')
  statusCode!: number;

  @Column({ type: 'jsonb', nullable: true })
  requestBody!: JsonValue | null;

  @Column({ type: 'jsonb', nullable: true })
  queryParams!: JsonValue | null;

  @Column({ type: 'jsonb', nullable: true })
  routeParams!: JsonValue | null;

  @Column({ type: 'jsonb', nullable: true })
  responseBody!: JsonValue | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'text', nullable: true })
  errorTrace!: string | null;

  @Column('int')
  durationMs!: number;

  @Column('uuid', { nullable: true })
  userId!: string | null;

  @Column('uuid', { nullable: true })
  organizationId!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  traceId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
