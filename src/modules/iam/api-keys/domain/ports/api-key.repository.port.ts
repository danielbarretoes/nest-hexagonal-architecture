import { Paginated } from '../../../../../shared/domain/primitives/paginated';
import type { ApiKey } from '../entities/api-key.entity';

export interface ApiKeyQueryOptions {
  includeRevoked?: boolean;
}

export interface ApiKeyRepositoryPort {
  findById(id: string, options?: ApiKeyQueryOptions): Promise<ApiKey | null>;
  findPaginatedByOwner(
    organizationId: string,
    ownerUserId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<ApiKey>>;
  create(apiKey: ApiKey): Promise<ApiKey>;
  update(apiKey: ApiKey): Promise<ApiKey>;
}
