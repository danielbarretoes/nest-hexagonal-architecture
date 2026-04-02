import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Paginated } from '../../../../../../../shared/domain/primitives/paginated';
import { TenantContextRequiredException } from '../../../../../../../shared/domain/exceptions';
import type {
  ApiKeyQueryOptions,
  ApiKeyRepositoryPort,
} from '../../../../domain/ports/api-key.repository.port';
import type { ApiKey } from '../../../../domain/entities/api-key.entity';
import { ApiKeyMapper } from '../mappers/api-key.mapper';
import { ApiKeyTypeOrmEntity } from '../entities/api-key.entity';

const RLS_RUNTIME_ROLE = process.env.DB_RLS_RUNTIME_ROLE || 'hexagonal_app_runtime';

@Injectable()
export class ApiKeyTypeOrmRepository implements ApiKeyRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(ApiKeyTypeOrmEntity)
    private readonly repository: Repository<ApiKeyTypeOrmEntity>,
  ) {}

  async findById(id: string, options?: ApiKeyQueryOptions): Promise<ApiKey | null> {
    const entity = await this.dataSource.transaction(async (manager) => {
      await manager.query(`SET LOCAL ROLE ${RLS_RUNTIME_ROLE}`);
      await manager.query(`SELECT set_config('app.current_api_key_id', $1, true)`, [id]);

      return manager.getRepository(ApiKeyTypeOrmEntity).findOne({
        where: {
          id,
          revokedAt: options?.includeRevoked ? undefined : IsNull(),
        },
      });
    });

    return entity ? ApiKeyMapper.toDomain(entity) : null;
  }

  private async runWithinTenantScope<T>(
    organizationId: string,
    operation: (repository: Repository<ApiKeyTypeOrmEntity>) => Promise<T>,
  ): Promise<T> {
    if (!organizationId) {
      throw new TenantContextRequiredException('api_keys');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SET LOCAL ROLE ${RLS_RUNTIME_ROLE}`);
      await manager.query(`SELECT set_config('app.current_organization_id', $1, true)`, [
        organizationId,
      ]);

      return operation(manager.getRepository(ApiKeyTypeOrmEntity));
    });
  }

  async findPaginatedByOwner(
    organizationId: string,
    ownerUserId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<ApiKey>> {
    const skip = (page - 1) * limit;
    const [entities, total] = await this.runWithinTenantScope(organizationId, (repository) =>
      repository.findAndCount({
        where: {
          organizationId,
          ownerUserId,
        },
        skip,
        take: limit,
        order: {
          createdAt: 'DESC',
        },
      }),
    );

    return Paginated.create(entities.map(ApiKeyMapper.toDomain), total, page, limit);
  }

  async create(apiKey: ApiKey): Promise<ApiKey> {
    const saved = await this.runWithinTenantScope(apiKey.organizationId, async (repository) => {
      const entity = repository.create(ApiKeyMapper.toPersistence(apiKey));
      return repository.save(entity);
    });
    return ApiKeyMapper.toDomain(saved);
  }

  async update(apiKey: ApiKey): Promise<ApiKey> {
    const saved = await this.runWithinTenantScope(apiKey.organizationId, async (repository) => {
      const entity = repository.create(ApiKeyMapper.toPersistence(apiKey));
      return repository.save(entity);
    });
    return ApiKeyMapper.toDomain(saved);
  }
}
