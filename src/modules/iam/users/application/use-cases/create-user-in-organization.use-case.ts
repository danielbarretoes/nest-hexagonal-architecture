import { Inject, Injectable } from '@nestjs/common';
import { TRANSACTION_RUNNER_PORT } from '../../../../../shared/application/ports/transaction-runner.token';
import { WEBHOOK_EVENT_PUBLISHER_PORT } from '../../../../../shared/application/ports/webhook-event-publisher.token';
import type { TransactionRunnerPort } from '../../../../../shared/domain/ports/transaction-runner.port';
import type { WebhookEventPublisherPort } from '../../../../../shared/domain/ports/webhook-event-publisher.port';
import { WEBHOOK_EVENT_TYPES } from '../../../../../shared/domain/integration-events/webhook-event-types';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import {
  DEFAULT_ROLE_CODES,
  type DefaultRoleCode,
} from '../../../shared/domain/authorization/default-role-codes';
import { ROLE_REPOSITORY_TOKEN } from '../../../roles/application/ports/role-repository.token';
import type { RoleRepositoryPort } from '../../../roles/domain/ports/role.repository.port';
import type { MemberRepositoryPort } from '../../../organizations/domain/ports/member.repository.port';
import { MEMBER_REPOSITORY_TOKEN } from '../../../organizations/application/ports/member-repository.token';
import { USER_REPOSITORY_TOKEN } from '../ports/user-repository.token';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { CreateUserProps, User } from '../../domain/entities/user.entity';
import {
  RoleNotFoundException,
  UserAlreadyExistsException,
} from '../../../shared/domain/exceptions';

export interface CreateUserInOrganizationCommand {
  organizationId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleCode?: DefaultRoleCode;
}

@Injectable()
export class CreateUserInOrganizationUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
    @Inject(ROLE_REPOSITORY_TOKEN)
    private readonly roleRepository: RoleRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(TRANSACTION_RUNNER_PORT)
    private readonly transactionRunner: TransactionRunnerPort,
    @Inject(WEBHOOK_EVENT_PUBLISHER_PORT)
    private readonly webhookEventPublisher: WebhookEventPublisherPort,
  ) {}

  async execute(command: CreateUserInOrganizationCommand): Promise<User> {
    return this.transactionRunner.runInTransaction(async () => {
      const existingUser = await this.userRepository.findByEmail(command.email, {
        includeDeleted: true,
      });

      if (existingUser) {
        throw new UserAlreadyExistsException(command.email);
      }

      const passwordHash = await this.passwordHasher.hash(command.password);
      const props: CreateUserProps & { id: string } = {
        id: crypto.randomUUID(),
        email: command.email,
        passwordHash,
        firstName: command.firstName,
        lastName: command.lastName,
      };
      const user = await this.userRepository.create(props);
      const roleCode = command.roleCode ?? DEFAULT_ROLE_CODES[3];
      const role = await this.roleRepository.findByCode(roleCode);

      if (!role) {
        throw new RoleNotFoundException(roleCode);
      }

      await this.memberRepository.create({
        userId: user.id,
        organizationId: command.organizationId,
        roleId: role.id,
      });

      await this.webhookEventPublisher.publish({
        type: WEBHOOK_EVENT_TYPES.IAM_USER_CREATED,
        organizationId: command.organizationId,
        payload: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleCode,
        },
      });

      return user;
    });
  }
}
