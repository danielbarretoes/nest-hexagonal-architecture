import { Inject, Injectable } from '@nestjs/common';
import { getAppConfig } from '../../../../../config/env/app-config';
import { USER_REPOSITORY_TOKEN } from '../../../users/application/ports/user-repository.token';
import type { UserRepositoryPort } from '../../../users/domain/ports/user.repository.port';
import { MEMBER_REPOSITORY_TOKEN } from '../../../organizations/application/ports/member-repository.token';
import type { MemberRepositoryPort } from '../../../organizations/domain/ports/member.repository.port';
import type {
  ApiKeyAuthenticationResult,
  ApiKeyAuthenticatorPort,
} from '../ports/api-key-authenticator.port';
import { API_KEY_REPOSITORY_TOKEN } from '../ports/api-key-repository.token';
import { API_KEY_SECRET_HASHER_TOKEN } from '../ports/api-key-secret-hasher.token';
import type { ApiKeyRepositoryPort } from '../../domain/ports/api-key.repository.port';
import type { ApiKeySecretHasherPort } from '../../domain/ports/api-key-secret-hasher.port';
import { parseApiKeyToken } from '../../domain/security/api-key-token';

@Injectable()
export class AuthenticateApiKeyUseCase implements ApiKeyAuthenticatorPort {
  constructor(
    @Inject(API_KEY_REPOSITORY_TOKEN)
    private readonly apiKeyRepository: ApiKeyRepositoryPort,
    @Inject(API_KEY_SECRET_HASHER_TOKEN)
    private readonly apiKeySecretHasher: ApiKeySecretHasherPort,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
  ) {}

  async authenticate(
    token: string,
    remoteIp?: string | null,
  ): Promise<ApiKeyAuthenticationResult | null> {
    const tokenParts = parseApiKeyToken(token);

    if (!tokenParts) {
      return null;
    }

    const apiKey = await this.apiKeyRepository.findById(tokenParts.id, {
      includeRevoked: true,
    });

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    if (!this.apiKeySecretHasher.verify(tokenParts.secret, apiKey.secretHash)) {
      return null;
    }

    const user = await this.userRepository.findById(apiKey.ownerUserId, {
      includeDeleted: true,
    });

    if (!user || user.isDeleted) {
      return null;
    }

    const membership = await this.memberRepository.findByUserAndOrganization(
      user.id,
      apiKey.organizationId,
    );

    if (!membership) {
      return null;
    }

    if (apiKey.shouldRecordUsage(getAppConfig().apiKeys.usageWriteIntervalMs)) {
      await this.apiKeyRepository.update(apiKey.recordUsage(remoteIp));
    }

    return {
      userId: user.id,
      email: user.email,
      organizationId: apiKey.organizationId,
      apiKeyId: apiKey.id,
      apiKeyName: apiKey.name,
      scopes: apiKey.scopes,
    };
  }
}
