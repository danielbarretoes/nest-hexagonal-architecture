import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_AUDIT_PORT } from '../../../../../shared/application/ports/admin-audit.token';
import { TRANSACTION_RUNNER_PORT } from '../../../../../shared/application/ports/transaction-runner.token';
import { WEBHOOK_EVENT_PUBLISHER_PORT } from '../../../../../shared/application/ports/webhook-event-publisher.token';
import type { PermissionCode } from '../../../../../shared/domain/authorization/permission-codes';
import type { AdminAuditPort } from '../../../../../shared/domain/ports/admin-audit.port';
import type { TransactionRunnerPort } from '../../../../../shared/domain/ports/transaction-runner.port';
import type { WebhookEventPublisherPort } from '../../../../../shared/domain/ports/webhook-event-publisher.port';
import { WEBHOOK_EVENT_TYPES } from '../../../../../shared/domain/integration-events/webhook-event-types';
import { MEMBER_REPOSITORY_TOKEN } from '../../../organizations/application/ports/member-repository.token';
import type { MemberRepositoryPort } from '../../../organizations/domain/ports/member.repository.port';
import {
  API_KEYS_RUNTIME_OPTIONS,
  type ApiKeysRuntimeOptions,
} from '../ports/api-keys-runtime-options.token';
import { API_KEY_REPOSITORY_TOKEN } from '../ports/api-key-repository.token';
import { API_KEY_SECRET_HASHER_TOKEN } from '../ports/api-key-secret-hasher.token';
import type { ApiKeyRepositoryPort } from '../../domain/ports/api-key.repository.port';
import type { ApiKeySecretHasherPort } from '../../domain/ports/api-key-secret-hasher.port';
import { ApiKey } from '../../domain/entities/api-key.entity';
import { createApiKeyToken } from '../../domain/security/api-key-token';
import { InvalidApiKeyScopesException } from '../../../shared/domain/exceptions';

export interface CreateApiKeyCommand {
  organizationId: string;
  ownerUserId: string;
  name: string;
  scopes?: readonly PermissionCode[];
  expiresInDays?: number;
}

export interface CreateApiKeyResponse {
  apiKey: string;
  id: string;
  name: string;
  keyPrefix: string;
  scopes: readonly PermissionCode[];
  expiresAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class CreateApiKeyUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY_TOKEN)
    private readonly apiKeyRepository: ApiKeyRepositoryPort,
    @Inject(API_KEY_SECRET_HASHER_TOKEN)
    private readonly apiKeySecretHasher: ApiKeySecretHasherPort,
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
    @Inject(ADMIN_AUDIT_PORT)
    private readonly adminAuditPort: AdminAuditPort,
    @Inject(TRANSACTION_RUNNER_PORT)
    private readonly transactionRunner: TransactionRunnerPort,
    @Inject(WEBHOOK_EVENT_PUBLISHER_PORT)
    private readonly webhookEventPublisher: WebhookEventPublisherPort,
    @Inject(API_KEYS_RUNTIME_OPTIONS)
    private readonly apiKeysRuntimeOptions: ApiKeysRuntimeOptions,
  ) {}

  async execute(command: CreateApiKeyCommand): Promise<CreateApiKeyResponse> {
    return this.transactionRunner.runInTransaction(async () => {
      const membership = await this.memberRepository.findByUserAndOrganization(
        command.ownerUserId,
        command.organizationId,
      );

      if (!membership) {
        throw new InvalidApiKeyScopesException();
      }

      const allowedScopes = membership.role.permissions;
      const requestedScopes =
        command.scopes && command.scopes.length > 0
          ? [...new Set(command.scopes)]
          : [...allowedScopes];

      if (requestedScopes.some((scope) => !allowedScopes.includes(scope))) {
        throw new InvalidApiKeyScopesException();
      }

      const tokenParts = createApiKeyToken(this.apiKeysRuntimeOptions.nodeEnv);
      const expiresInDays = command.expiresInDays ?? this.apiKeysRuntimeOptions.defaultTtlDays;
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
      const apiKey = ApiKey.create({
        id: tokenParts.id,
        organizationId: command.organizationId,
        ownerUserId: command.ownerUserId,
        name: command.name,
        keyPrefix: tokenParts.keyPrefix,
        secretHash: this.apiKeySecretHasher.hash(tokenParts.secret),
        scopes: requestedScopes,
        expiresAt,
      });

      const createdApiKey = await this.apiKeyRepository.create(apiKey);

      await this.adminAuditPort.record({
        action: 'iam.api_key.created',
        actorUserId: command.ownerUserId,
        organizationId: command.organizationId,
        resourceType: 'api_key',
        resourceId: createdApiKey.id,
        payload: {
          name: createdApiKey.name,
          scopes: createdApiKey.scopes,
          expiresAt: createdApiKey.expiresAt?.toISOString() ?? null,
        },
      });

      await this.webhookEventPublisher.publish({
        type: WEBHOOK_EVENT_TYPES.IAM_API_KEY_CREATED,
        organizationId: command.organizationId,
        payload: {
          apiKeyId: createdApiKey.id,
          ownerUserId: command.ownerUserId,
          name: createdApiKey.name,
          scopes: createdApiKey.scopes,
          expiresAt: createdApiKey.expiresAt?.toISOString() ?? null,
        },
      });

      return {
        apiKey: tokenParts.token,
        id: createdApiKey.id,
        name: createdApiKey.name,
        keyPrefix: createdApiKey.keyPrefix,
        scopes: createdApiKey.scopes,
        expiresAt: createdApiKey.expiresAt,
        createdAt: createdApiKey.createdAt,
      };
    });
  }
}
