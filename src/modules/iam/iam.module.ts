/**
 * IAM Module
 * Orchestrates authentication, users, and organizations sub-modules.
 * Single entry point for the IAM bounded context.
 */

import { Module } from '@nestjs/common';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [UsersModule, AuthModule, OrganizationsModule, RolesModule, ApiKeysModule],
  controllers: [],
  providers: [],
  exports: [UsersModule, AuthModule, OrganizationsModule, RolesModule, ApiKeysModule],
})
export class IamModule {}
