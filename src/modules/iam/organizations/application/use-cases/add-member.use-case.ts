import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_AUDIT_PORT } from '../../../../../shared/application/ports/admin-audit.token';
import { TRANSACTION_RUNNER_PORT } from '../../../../../shared/application/ports/transaction-runner.token';
import { WEBHOOK_EVENT_PUBLISHER_PORT } from '../../../../../shared/application/ports/webhook-event-publisher.token';
import type { AdminAuditPort } from '../../../../../shared/domain/ports/admin-audit.port';
import type { TransactionRunnerPort } from '../../../../../shared/domain/ports/transaction-runner.port';
import type { WebhookEventPublisherPort } from '../../../../../shared/domain/ports/webhook-event-publisher.port';
import { WEBHOOK_EVENT_TYPES } from '../../../../../shared/domain/integration-events/webhook-event-types';
import { USER_REPOSITORY_TOKEN } from '../../../users/application/ports/user-repository.token';
import type { UserRepositoryPort } from '../../../users/domain/ports/user.repository.port';
import { ROLE_REPOSITORY_TOKEN } from '../../../roles/application/ports/role-repository.token';
import type { RoleRepositoryPort } from '../../../roles/domain/ports/role.repository.port';
import { DEFAULT_ROLE_CODES } from '../../../shared/domain/authorization/default-role-codes';
import { MEMBER_REPOSITORY_TOKEN } from '../ports/member-repository.token';
import type { MemberRepositoryPort } from '../../domain/ports/member.repository.port';
import { Member } from '../../domain/entities/member.entity';
import { RoleNotFoundException, UserNotFoundException } from '../../../shared/domain/exceptions';
import { TenantMembershipManagementPolicy } from '../policies/tenant-membership-management.policy';

export interface AddMemberCommand {
  organizationId: string;
  userId: string;
  roleCode?: string;
  actorUserId?: string;
}

@Injectable()
export class AddMemberUseCase {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(ROLE_REPOSITORY_TOKEN)
    private readonly roleRepository: RoleRepositoryPort,
    @Inject(ADMIN_AUDIT_PORT)
    private readonly adminAuditPort: AdminAuditPort,
    @Inject(TRANSACTION_RUNNER_PORT)
    private readonly transactionRunner: TransactionRunnerPort,
    @Inject(WEBHOOK_EVENT_PUBLISHER_PORT)
    private readonly webhookEventPublisher: WebhookEventPublisherPort,
    private readonly tenantMembershipManagementPolicy: TenantMembershipManagementPolicy,
  ) {}

  async execute(command: AddMemberCommand): Promise<Member> {
    return this.transactionRunner.runInTransaction(async () => {
      const user = await this.userRepository.findById(command.userId);

      if (!user) {
        throw new UserNotFoundException(command.userId);
      }

      const existingMember = await this.memberRepository.findByUserAndOrganization(
        command.userId,
        command.organizationId,
      );

      this.tenantMembershipManagementPolicy.assertMemberCanBeAdded(
        existingMember,
        command.userId,
        command.organizationId,
      );

      const roleCode = command.roleCode ?? DEFAULT_ROLE_CODES[3];
      const role = await this.roleRepository.findByCode(roleCode);

      if (!role) {
        throw new RoleNotFoundException(roleCode);
      }

      const member = await this.memberRepository.create({
        userId: command.userId,
        organizationId: command.organizationId,
        roleId: role.id,
      });

      await this.adminAuditPort.record({
        action: 'iam.member.added',
        actorUserId: command.actorUserId ?? null,
        organizationId: command.organizationId,
        resourceType: 'member',
        resourceId: member.id,
        payload: {
          targetUserId: command.userId,
          roleCode,
        },
      });

      await this.webhookEventPublisher.publish({
        type: WEBHOOK_EVENT_TYPES.IAM_MEMBER_ADDED,
        organizationId: command.organizationId,
        payload: {
          memberId: member.id,
          userId: command.userId,
          roleCode,
          actorUserId: command.actorUserId ?? null,
        },
      });

      return member;
    });
  }
}
