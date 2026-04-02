import type { ApiKeyUsageSummary, UsageCounter } from '../entities/usage-counter.entity';

export interface UsageCounterRepositoryPort {
  increment(counter: UsageCounter): Promise<void>;
  getApiKeyRequestSummary(
    organizationId: string,
    since: Date,
    limit: number,
  ): Promise<readonly ApiKeyUsageSummary[]>;
}
