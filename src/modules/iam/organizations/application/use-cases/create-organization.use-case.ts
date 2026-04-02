/**
 * Create Organization Use Case
 */

import { Inject, Injectable } from '@nestjs/common';
import { TRANSACTION_RUNNER_PORT } from '../../../../../shared/application/ports/transaction-runner.token';
import type { TransactionRunnerPort } from '../../../../../shared/domain/ports/transaction-runner.port';
import { Organization, CreateOrganizationProps } from '../../domain/entities/organization.entity';
import type { OrganizationRepositoryPort } from '../../domain/ports/organization.repository.port';
import { ORGANIZATION_REPOSITORY_TOKEN } from '../ports/organization-repository.token';
import type { MemberRepositoryPort } from '../../domain/ports/member.repository.port';
import { MEMBER_REPOSITORY_TOKEN } from '../ports/member-repository.token';
import type { RoleRepositoryPort } from '../../../roles/domain/ports/role.repository.port';
import { ROLE_REPOSITORY_TOKEN } from '../../../roles/application/ports/role-repository.token';
import { DEFAULT_ROLE_CODES } from '../../../shared/domain/authorization/default-role-codes';
import {
  OrganizationAlreadyExistsException,
  RoleNotFoundException,
} from '../../../shared/domain/exceptions';

export interface CreateOrganizationCommand {
  name: string;
  ownerUserId: string;
}

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryPort,
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
    @Inject(ROLE_REPOSITORY_TOKEN)
    private readonly roleRepository: RoleRepositoryPort,
    @Inject(TRANSACTION_RUNNER_PORT)
    private readonly transactionRunner: TransactionRunnerPort,
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<Organization> {
    return this.transactionRunner.runInTransaction(async () => {
      const existingOrganization = await this.organizationRepository.findByName(command.name, {
        includeDeleted: true,
      });

      if (existingOrganization) {
        throw new OrganizationAlreadyExistsException(command.name);
      }

      const ownerRole = await this.roleRepository.findByCode(DEFAULT_ROLE_CODES[0]);

      if (!ownerRole) {
        throw new RoleNotFoundException(DEFAULT_ROLE_CODES[0]);
      }

      const props: CreateOrganizationProps & { id: string } = {
        id: crypto.randomUUID(),
        name: command.name,
      };

      const organization = await this.organizationRepository.create(props);

      await this.memberRepository.create({
        userId: command.ownerUserId,
        organizationId: organization.id,
        roleId: ownerRole.id,
      });

      return organization;
    });
  }
}
