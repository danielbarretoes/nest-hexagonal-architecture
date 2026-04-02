import { Inject, Injectable } from '@nestjs/common';
import { UsageCounter } from '../domain/entities/usage-counter.entity';
import { USAGE_COUNTER_REPOSITORY_TOKEN } from './ports/usage-counter-repository.token';
import type { UsageCounterRepositoryPort } from '../domain/ports/usage-counter.repository.port';
import type { UsageMeterPort } from '../../../shared/domain/ports/usage-meter.port';

@Injectable()
export class UsageMeterService implements UsageMeterPort {
  constructor(
    @Inject(USAGE_COUNTER_REPOSITORY_TOKEN)
    private readonly usageCounterRepository: UsageCounterRepositoryPort,
  ) {}

  async record(command: Parameters<UsageMeterPort['record']>[0]): Promise<void> {
    await this.usageCounterRepository.increment(
      UsageCounter.create({
        metricKey: command.metricKey,
        organizationId: command.organizationId,
        userId: command.userId,
        apiKeyId: command.apiKeyId ?? '',
        routeKey: command.routeKey,
        statusCode: command.statusCode,
        occurredAt: command.occurredAt,
      }),
    );
  }
}
