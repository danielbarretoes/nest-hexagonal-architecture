import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { AuditLogRepositoryPort } from '../../../../domain/ports/audit-log.repository.port';
import type { AuditLog } from '../../../../domain/entities/audit-log.entity';
import { getTypeormEntityManager } from '../../../../../../../common/infrastructure/database/typeorm/transaction/typeorm-transaction.utils';

@Injectable()
export class AuditLogTypeOrmRepository implements AuditLogRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(auditLog: AuditLog): Promise<AuditLog> {
    await getTypeormEntityManager(this.dataSource).query(
      `
        INSERT INTO "audit_logs" (
          "id",
          "action",
          "actor_user_id",
          "organization_id",
          "resource_type",
          "resource_id",
          "payload",
          "created_at"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        auditLog.id,
        auditLog.action,
        auditLog.actorUserId,
        auditLog.organizationId,
        auditLog.resourceType,
        auditLog.resourceId,
        auditLog.payload,
        auditLog.createdAt,
      ],
    );

    return auditLog;
  }
}
