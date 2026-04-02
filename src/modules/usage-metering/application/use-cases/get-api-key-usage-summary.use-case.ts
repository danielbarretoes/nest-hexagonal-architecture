import { Inject, Injectable } from '@nestjs/common';
import type { ApiKeyUsageSummary } from '../../domain/entities/usage-counter.entity';
import { USAGE_COUNTER_REPOSITORY_TOKEN } from '../ports/usage-counter-repository.token';
import type { UsageCounterRepositoryPort } from '../../domain/ports/usage-counter.repository.port';

@Injectable()
export class GetApiKeyUsageSummaryUseCase {
  constructor(
    @Inject(USAGE_COUNTER_REPOSITORY_TOKEN)
    private readonly usageCounterRepository: UsageCounterRepositoryPort,
  ) {}

  async execute(
    organizationId: string,
    windowHours = 24,
    limit = 100,
  ): Promise<readonly ApiKeyUsageSummary[]> {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    return this.usageCounterRepository.getApiKeyRequestSummary(organizationId, since, limit);
  }
}
