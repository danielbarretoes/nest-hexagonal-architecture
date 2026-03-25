import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { HttpLogTypeOrmEntity } from '../entities/http-log.entity';
import type {
  FindHttpLogsFilters,
  HttpLogRepositoryPort,
} from '../../../../domain/ports/http-log.repository.port';
import type { HttpLog } from '../../../../domain/entities/http-log.entity';
import { HttpLogMapper } from '../mappers/http-log.mapper';
import { Paginated } from '../../../../../../../shared/domain/primitives/paginated';
import { TenantContext } from '../../../../../../../common/tenant/tenant-context';

@Injectable()
export class HttpLogTypeOrmRepository implements HttpLogRepositoryPort {
  constructor(
    @InjectRepository(HttpLogTypeOrmEntity)
    private readonly repository: Repository<HttpLogTypeOrmEntity>,
  ) {}

  async save(log: HttpLog): Promise<void> {
    await this.repository.save(HttpLogMapper.toPersistence(log));
  }

  async findById(id: string): Promise<HttpLog | null> {
    const organizationId = TenantContext.getOrganizationId();
    const entity = await this.repository.findOne({
      where: {
        id,
        organizationId: organizationId || undefined,
      },
    });

    return entity ? HttpLogMapper.toDomain(entity) : null;
  }

  async findByTraceId(traceId: string): Promise<HttpLog[]> {
    const organizationId = TenantContext.getOrganizationId();
    const entities = await this.repository.find({
      where: {
        traceId,
        organizationId: organizationId || undefined,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return entities.map(HttpLogMapper.toDomain);
  }

  async findPaginated(
    page: number,
    limit: number,
    filters?: FindHttpLogsFilters,
  ): Promise<Paginated<HttpLog>> {
    const skip = (page - 1) * limit;
    const [entities, total] = await this.repository.findAndCount({
      where: this.buildWhere(filters),
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    return Paginated.create(entities.map(HttpLogMapper.toDomain), total, page, limit);
  }

  private buildWhere(filters?: FindHttpLogsFilters): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    const organizationId = TenantContext.getOrganizationId();

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (filters?.createdFrom && filters?.createdTo) {
      where.createdAt = Between(filters.createdFrom, filters.createdTo);
    } else if (filters?.createdFrom) {
      where.createdAt = MoreThanOrEqual(filters.createdFrom);
    } else if (filters?.createdTo) {
      where.createdAt = LessThanOrEqual(filters.createdTo);
    }

    if (filters?.statusFamily) {
      const [minStatusCode, maxStatusCode] = this.toStatusRange(filters.statusFamily);
      where.statusCode = Between(minStatusCode, maxStatusCode);
    }

    return where;
  }

  private toStatusRange(statusFamily: FindHttpLogsFilters['statusFamily']): [number, number] {
    switch (statusFamily) {
      case '2xx':
        return [200, 299];
      case '3xx':
        return [300, 399];
      case '4xx':
        return [400, 499];
      case '5xx':
        return [500, 599];
      default:
        return [100, 599];
    }
  }
}
