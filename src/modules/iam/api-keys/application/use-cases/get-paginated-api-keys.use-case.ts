import { Inject, Injectable } from '@nestjs/common';
import { API_KEY_REPOSITORY_TOKEN } from '../ports/api-key-repository.token';
import type { ApiKeyRepositoryPort } from '../../domain/ports/api-key.repository.port';

@Injectable()
export class GetPaginatedApiKeysUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY_TOKEN)
    private readonly apiKeyRepository: ApiKeyRepositoryPort,
  ) {}

  async execute(organizationId: string, ownerUserId: string, page: number, limit: number) {
    return this.apiKeyRepository.findPaginatedByOwner(organizationId, ownerUserId, page, limit);
  }
}
