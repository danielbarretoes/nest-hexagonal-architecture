/**
 * Tenant Module
 * Global module for multi-tenant context management.
 * Registers the interceptor that opens the async tenant scope after authentication.
 */

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OrganizationsModule } from '../../modules/iam/organizations/organizations.module';
import { TenantInterceptor } from './tenant.interceptor';

@Module({
  imports: [OrganizationsModule],
  providers: [
    TenantInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useExisting: TenantInterceptor,
    },
  ],
})
export class TenantModule {}
