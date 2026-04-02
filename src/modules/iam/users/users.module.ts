/**
 * Users Module
 * Internal module for user management within IAM context.
 */

import { Module } from '@nestjs/common';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { CreateUserInOrganizationUseCase } from './application/use-cases/create-user-in-organization.use-case';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case';
import { GetPaginatedUsersUseCase } from './application/use-cases/get-paginated-users.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { RestoreUserUseCase } from './application/use-cases/restore-user.use-case';
import { UpdateUserProfileInOrganizationUseCase } from './application/use-cases/update-user-profile-in-organization.use-case';
import { UsersController } from './presentation/controllers/users.controller';
import { AuthSupportModule } from '../auth/auth-support.module';
import { UsersAccessModule } from './users-access.module';
import { IamAuthorizationAccessModule } from '../iam-authorization-access.module';
import { RolesAccessModule } from '../roles/roles-access.module';
import { TenantUserManagementPolicy } from './application/policies/tenant-user-management.policy';
import { PermissionGuard } from '../../../common/http/guards/permission.guard';
import { EmailAccessModule } from '../../notifications/email/email-access.module';
import { WebhooksAccessModule } from '../../webhooks/webhooks-access.module';

@Module({
  imports: [
    UsersAccessModule,
    AuthSupportModule,
    IamAuthorizationAccessModule,
    RolesAccessModule,
    EmailAccessModule,
    WebhooksAccessModule,
  ],
  controllers: [UsersController],
  providers: [
    RegisterUserUseCase,
    CreateUserInOrganizationUseCase,
    GetUserByIdUseCase,
    GetPaginatedUsersUseCase,
    DeleteUserUseCase,
    RestoreUserUseCase,
    UpdateUserProfileInOrganizationUseCase,
    TenantUserManagementPolicy,
    PermissionGuard,
  ],
  exports: [
    UsersAccessModule,
    RegisterUserUseCase,
    CreateUserInOrganizationUseCase,
    GetUserByIdUseCase,
    GetPaginatedUsersUseCase,
    DeleteUserUseCase,
    RestoreUserUseCase,
    UpdateUserProfileInOrganizationUseCase,
  ],
})
export class UsersModule {}
