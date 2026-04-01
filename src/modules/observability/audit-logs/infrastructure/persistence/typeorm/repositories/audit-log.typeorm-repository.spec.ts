import type { Repository } from 'typeorm';
import { AuditLog } from '../../../../domain/entities/audit-log.entity';
import { AuditLogTypeOrmEntity } from '../entities/audit-log.entity';
import { AuditLogTypeOrmRepository } from './audit-log.typeorm-repository';

describe('AuditLogTypeOrmRepository', () => {
  it('persists audit logs with the expected insert payload', async () => {
    const repositoryMock = {
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as Repository<AuditLogTypeOrmEntity>;
    const repository = new AuditLogTypeOrmRepository(repositoryMock);
    const auditLog = AuditLog.create({
      action: 'iam.member.added',
      actorUserId: 'user-1',
      organizationId: 'org-1',
      resourceType: 'member',
      resourceId: 'member-1',
      payload: { roleCode: 'member' },
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    });

    await expect(repository.create(auditLog)).resolves.toBe(auditLog);
    expect(repositoryMock.query).toHaveBeenCalledTimes(1);
    expect(repositoryMock.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "audit_logs"'),
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
  });
});
