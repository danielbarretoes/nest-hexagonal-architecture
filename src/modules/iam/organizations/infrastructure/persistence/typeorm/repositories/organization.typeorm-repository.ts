/**
 * Organization TypeORM Repository
 */

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { OrganizationTypeOrmEntity } from '../entities/organization.entity';
import {
  OrganizationQueryOptions,
  OrganizationRepositoryPort,
} from '../../../../domain/ports/organization.repository.port';
import { OrganizationMapper } from '../mappers/organization.mapper';
import type {
  Organization,
  CreateOrganizationProps,
} from '../../../../domain/entities/organization.entity';
import { Paginated } from '../../../../../../../shared/domain/primitives/paginated';
import { OrganizationNotFoundException } from '../../../../../shared/domain/exceptions';
import { getTypeormRepository } from '../../../../../../../common/infrastructure/database/typeorm/transaction/typeorm-transaction.utils';

@Injectable()
export class OrganizationTypeOrmRepository implements OrganizationRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string, options?: OrganizationQueryOptions): Promise<Organization | null> {
    const entity = await getTypeormRepository(this.dataSource, OrganizationTypeOrmEntity).findOne({
      where: { id },
      withDeleted: options?.includeDeleted ?? false,
    });
    return entity ? OrganizationMapper.toDomain(entity) : null;
  }

  async findManyByIds(
    ids: readonly string[],
    options?: OrganizationQueryOptions,
  ): Promise<Organization[]> {
    if (ids.length === 0) {
      return [];
    }

    const entities = await getTypeormRepository(this.dataSource, OrganizationTypeOrmEntity).find({
      where: { id: In([...ids]) },
      withDeleted: options?.includeDeleted ?? false,
    });
    const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));

    return ids
      .map((id) => entitiesById.get(id))
      .filter((entity): entity is OrganizationTypeOrmEntity => Boolean(entity))
      .map(OrganizationMapper.toDomain);
  }

  async findByName(name: string, options?: OrganizationQueryOptions): Promise<Organization | null> {
    const entity = await getTypeormRepository(this.dataSource, OrganizationTypeOrmEntity).findOne({
      where: { name: name.trim() },
      withDeleted: options?.includeDeleted ?? false,
    });
    return entity ? OrganizationMapper.toDomain(entity) : null;
  }

  async findPaginated(page: number, limit: number): Promise<Paginated<Organization>> {
    const skip = (page - 1) * limit;
    const [entities, total] = await getTypeormRepository(
      this.dataSource,
      OrganizationTypeOrmEntity,
    ).findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return Paginated.create(entities.map(OrganizationMapper.toDomain), total, page, limit);
  }

  async create(props: CreateOrganizationProps & { id: string }): Promise<Organization> {
    const repository = getTypeormRepository(this.dataSource, OrganizationTypeOrmEntity);
    const entity = repository.create({
      id: props.id,
      name: props.name,
    });
    const saved = await repository.save(entity);
    return OrganizationMapper.toDomain(saved);
  }

  async update(id: string, data: Partial<Organization>): Promise<Organization> {
    const updateData: Partial<OrganizationTypeOrmEntity> = {};
    if (data.name) updateData.name = data.name;
    if (data.deletedAt !== undefined) updateData.deletedAt = data.deletedAt;

    const repository = getTypeormRepository(this.dataSource, OrganizationTypeOrmEntity);

    await repository.update(id, updateData);
    const entity = await repository.findOne({ where: { id } });
    if (!entity) {
      throw new OrganizationNotFoundException(id);
    }
    return OrganizationMapper.toDomain(entity);
  }

  async delete(id: string): Promise<void> {
    await getTypeormRepository(this.dataSource, OrganizationTypeOrmEntity).softDelete(id);
  }

  async restore(id: string): Promise<Organization> {
    const repository = getTypeormRepository(this.dataSource, OrganizationTypeOrmEntity);

    await repository.restore(id);
    const entity = await repository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!entity) {
      throw new OrganizationNotFoundException(id);
    }

    return OrganizationMapper.toDomain(entity);
  }
}
