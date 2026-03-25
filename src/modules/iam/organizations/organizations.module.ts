/**
 * Organizations Module
 * Internal module for organization management within IAM context.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/organization.entity';
import { MemberTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/member.entity';
import { OrganizationTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/organization.typeorm-repository';
import { MemberTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/member.typeorm-repository';
import { CreateOrganizationUseCase } from './application/use-cases/create-organization.use-case';
import { GetOrganizationByIdUseCase } from './application/use-cases/get-organization-by-id.use-case';
import { GetPaginatedOrganizationsUseCase } from './application/use-cases/get-paginated-organizations.use-case';
import { DeleteOrganizationUseCase } from './application/use-cases/delete-organization.use-case';
import { RestoreOrganizationUseCase } from './application/use-cases/restore-organization.use-case';
import { ORGANIZATION_REPOSITORY_TOKEN } from './application/ports/organization-repository.token';
import { MEMBER_REPOSITORY_TOKEN } from './application/ports/member-repository.token';
import { OrganizationsController } from './presentation/controllers/organizations.controller';
import { AuthSupportModule } from '../auth/auth-support.module';
import { TenantMembershipAccessAdapter } from './infrastructure/adapters/tenant-membership-access.adapter';
import { TENANT_ACCESS_PORT } from '../../../shared/application/ports/tenant-access.token';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationTypeOrmEntity, MemberTypeOrmEntity]),
    AuthSupportModule,
  ],
  controllers: [OrganizationsController],
  providers: [
    { provide: ORGANIZATION_REPOSITORY_TOKEN, useClass: OrganizationTypeOrmRepository },
    { provide: MEMBER_REPOSITORY_TOKEN, useClass: MemberTypeOrmRepository },
    { provide: TENANT_ACCESS_PORT, useClass: TenantMembershipAccessAdapter },
    OrganizationTypeOrmRepository,
    MemberTypeOrmRepository,
    TenantMembershipAccessAdapter,
    CreateOrganizationUseCase,
    GetOrganizationByIdUseCase,
    GetPaginatedOrganizationsUseCase,
    DeleteOrganizationUseCase,
    RestoreOrganizationUseCase,
  ],
  exports: [
    ORGANIZATION_REPOSITORY_TOKEN,
    MEMBER_REPOSITORY_TOKEN,
    TENANT_ACCESS_PORT,
    CreateOrganizationUseCase,
    GetOrganizationByIdUseCase,
    GetPaginatedOrganizationsUseCase,
    DeleteOrganizationUseCase,
    RestoreOrganizationUseCase,
  ],
})
export class OrganizationsModule {}
