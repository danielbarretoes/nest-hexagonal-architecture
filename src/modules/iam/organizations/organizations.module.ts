/**
 * Organizations Module
 * Internal module for organization management within IAM context.
 */

import { Module } from '@nestjs/common';
import { CreateOrganizationUseCase } from './application/use-cases/create-organization.use-case';
import { GetOrganizationByIdUseCase } from './application/use-cases/get-organization-by-id.use-case';
import { GetPaginatedOrganizationsUseCase } from './application/use-cases/get-paginated-organizations.use-case';
import { DeleteOrganizationUseCase } from './application/use-cases/delete-organization.use-case';
import { RestoreOrganizationUseCase } from './application/use-cases/restore-organization.use-case';
import { RenameOrganizationUseCase } from './application/use-cases/rename-organization.use-case';
import { OrganizationsController } from './presentation/controllers/organizations.controller';
import { MembersController } from './presentation/controllers/members.controller';
import { OrganizationInvitationsController } from './presentation/controllers/organization-invitations.controller';
import { AuthSupportModule } from '../auth/auth-support.module';
import { OrganizationsAccessModule } from './organizations-access.module';
import { RolesAccessModule } from '../roles/roles-access.module';
import { TenantOrganizationPolicy } from './application/policies/tenant-organization-policy';
import { TenantMembershipManagementPolicy } from './application/policies/tenant-membership-management.policy';
import { PermissionGuard } from '../../../common/http/guards/permission.guard';
import { UsersAccessModule } from '../users/users-access.module';
import { AddMemberUseCase } from './application/use-cases/add-member.use-case';
import { GetOrganizationMembersUseCase } from './application/use-cases/get-organization-members.use-case';
import { ChangeMemberRoleUseCase } from './application/use-cases/change-member-role.use-case';
import { RemoveMemberUseCase } from './application/use-cases/remove-member.use-case';
import { CreateOrganizationInvitationUseCase } from './application/use-cases/create-organization-invitation.use-case';
import { AcceptOrganizationInvitationUseCase } from './application/use-cases/accept-organization-invitation.use-case';
import { AuditLogsAccessModule } from '../../observability/audit-logs/audit-logs-access.module';
import { EmailAccessModule } from '../../notifications/email/email-access.module';
import { WebhooksAccessModule } from '../../webhooks/webhooks-access.module';

@Module({
  imports: [
    OrganizationsAccessModule,
    AuthSupportModule,
    RolesAccessModule,
    UsersAccessModule,
    AuditLogsAccessModule,
    EmailAccessModule,
    WebhooksAccessModule,
  ],
  controllers: [OrganizationsController, MembersController, OrganizationInvitationsController],
  providers: [
    CreateOrganizationUseCase,
    GetOrganizationByIdUseCase,
    GetPaginatedOrganizationsUseCase,
    DeleteOrganizationUseCase,
    RestoreOrganizationUseCase,
    RenameOrganizationUseCase,
    AddMemberUseCase,
    GetOrganizationMembersUseCase,
    ChangeMemberRoleUseCase,
    RemoveMemberUseCase,
    CreateOrganizationInvitationUseCase,
    AcceptOrganizationInvitationUseCase,
    TenantOrganizationPolicy,
    TenantMembershipManagementPolicy,
    PermissionGuard,
  ],
  exports: [
    OrganizationsAccessModule,
    CreateOrganizationUseCase,
    GetOrganizationByIdUseCase,
    GetPaginatedOrganizationsUseCase,
    DeleteOrganizationUseCase,
    RestoreOrganizationUseCase,
    RenameOrganizationUseCase,
    AddMemberUseCase,
    GetOrganizationMembersUseCase,
    ChangeMemberRoleUseCase,
    RemoveMemberUseCase,
    CreateOrganizationInvitationUseCase,
    AcceptOrganizationInvitationUseCase,
  ],
})
export class OrganizationsModule {}
