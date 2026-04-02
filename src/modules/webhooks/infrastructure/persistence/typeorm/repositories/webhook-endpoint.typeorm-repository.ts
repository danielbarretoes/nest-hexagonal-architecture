import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, Repository } from 'typeorm';
import { Paginated } from '../../../../../../shared/domain/primitives/paginated';
import { TenantContextRequiredException } from '../../../../../../shared/domain/exceptions';
import { TypeormTransactionContext } from '../../../../../../common/infrastructure/database/typeorm/transaction/typeorm-transaction.context';
import type { WebhookEndpoint } from '../../../../domain/entities/webhook-endpoint.entity';
import type { WebhookEndpointRepositoryPort } from '../../../../domain/ports/webhook-endpoint.repository.port';
import { WebhookEndpointMapper } from '../mappers/webhook-endpoint.mapper';
import { WebhookEndpointTypeOrmEntity } from '../entities/webhook-endpoint.entity';

const RLS_RUNTIME_ROLE = process.env.DB_RLS_RUNTIME_ROLE || 'hexagonal_app_runtime';

@Injectable()
export class WebhookEndpointTypeOrmRepository implements WebhookEndpointRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string, organizationId: string): Promise<WebhookEndpoint | null> {
    const entity = await this.runWithinTenantScope(organizationId, (repository) =>
      repository.findOne({
        where: {
          id,
          organizationId,
        },
      }),
    );

    return entity ? WebhookEndpointMapper.toDomain(entity) : null;
  }

  async findPaginatedByOrganization(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<WebhookEndpoint>> {
    const skip = (page - 1) * limit;
    const [entities, total] = await this.runWithinTenantScope(organizationId, (repository) =>
      repository.findAndCount({
        where: { organizationId },
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      }),
    );

    return Paginated.create(entities.map(WebhookEndpointMapper.toDomain), total, page, limit);
  }

  async findSubscribedByOrganization(
    organizationId: string,
    eventType: string,
  ): Promise<readonly WebhookEndpoint[]> {
    const entities = await this.runWithinTenantScope(organizationId, (repository) =>
      repository
        .createQueryBuilder('endpoint')
        .where('endpoint.organization_id = :organizationId', { organizationId })
        .andWhere(':eventType = ANY(endpoint.events)', { eventType })
        .orderBy('endpoint.created_at', 'ASC')
        .getMany(),
    );

    return entities.map(WebhookEndpointMapper.toDomain);
  }

  async create(endpoint: WebhookEndpoint): Promise<WebhookEndpoint> {
    const saved = await this.runWithinTenantScope(endpoint.organizationId, async (repository) =>
      repository.save(repository.create(WebhookEndpointMapper.toPersistence(endpoint))),
    );

    return WebhookEndpointMapper.toDomain(saved);
  }

  async update(endpoint: WebhookEndpoint): Promise<WebhookEndpoint> {
    const saved = await this.runWithinTenantScope(endpoint.organizationId, async (repository) =>
      repository.save(repository.create(WebhookEndpointMapper.toPersistence(endpoint))),
    );

    return WebhookEndpointMapper.toDomain(saved);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.runWithinTenantScope(organizationId, async (repository) => {
      await repository.delete({
        id,
        organizationId,
      });
    });
  }

  private async runWithinTenantScope<T>(
    organizationId: string,
    operation: (repository: Repository<WebhookEndpointTypeOrmEntity>) => Promise<T>,
  ): Promise<T> {
    if (!organizationId) {
      throw new TenantContextRequiredException('webhook_endpoints');
    }

    const activeManager = TypeormTransactionContext.getManager();

    if (activeManager) {
      await activeManager.query(`SET LOCAL ROLE ${RLS_RUNTIME_ROLE}`);
      await activeManager.query(`SELECT set_config('app.current_organization_id', $1, true)`, [
        organizationId,
      ]);

      return operation(activeManager.getRepository(WebhookEndpointTypeOrmEntity));
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SET LOCAL ROLE ${RLS_RUNTIME_ROLE}`);
      await manager.query(`SELECT set_config('app.current_organization_id', $1, true)`, [
        organizationId,
      ]);

      return operation(manager.getRepository(WebhookEndpointTypeOrmEntity));
    });
  }
}
