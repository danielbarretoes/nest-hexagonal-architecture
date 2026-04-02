import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_AUDIT_PORT } from '../../../../../shared/application/ports/admin-audit.token';
import type { AdminAuditPort } from '../../../../../shared/domain/ports/admin-audit.port';
import { ApiKeyNotFoundException } from '../../../shared/domain/exceptions';
import { API_KEY_REPOSITORY_TOKEN } from '../ports/api-key-repository.token';
import type { ApiKeyRepositoryPort } from '../../domain/ports/api-key.repository.port';

export interface RevokeApiKeyCommand {
  apiKeyId: string;
  organizationId: string;
  ownerUserId: string;
}

@Injectable()
export class RevokeApiKeyUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY_TOKEN)
    private readonly apiKeyRepository: ApiKeyRepositoryPort,
    @Inject(ADMIN_AUDIT_PORT)
    private readonly adminAuditPort: AdminAuditPort,
  ) {}

  async execute(command: RevokeApiKeyCommand): Promise<void> {
    const apiKey = await this.apiKeyRepository.findById(command.apiKeyId, {
      includeRevoked: true,
    });

    if (
      !apiKey ||
      apiKey.organizationId !== command.organizationId ||
      apiKey.ownerUserId !== command.ownerUserId
    ) {
      throw new ApiKeyNotFoundException(command.apiKeyId);
    }

    if (apiKey.isRevoked) {
      return;
    }

    const revokedApiKey = apiKey.revoke();
    await this.apiKeyRepository.update(revokedApiKey);
    await this.adminAuditPort.record({
      action: 'iam.api_key.revoked',
      actorUserId: command.ownerUserId,
      organizationId: command.organizationId,
      resourceType: 'api_key',
      resourceId: revokedApiKey.id,
      payload: {
        name: revokedApiKey.name,
      },
    });
  }
}
