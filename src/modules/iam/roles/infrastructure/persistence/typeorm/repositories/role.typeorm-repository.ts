import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { RoleRepositoryPort } from '../../../../domain/ports/role.repository.port';
import { Role } from '../../../../domain/entities/role.entity';
import { RoleTypeOrmEntity } from '../entities/role.entity';
import { RoleMapper } from '../mappers/role.mapper';
import { getTypeormRepository } from '../../../../../../../common/infrastructure/database/typeorm/transaction/typeorm-transaction.utils';

@Injectable()
export class RoleTypeOrmRepository implements RoleRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<Role | null> {
    const entity = await getTypeormRepository(this.dataSource, RoleTypeOrmEntity).findOne({
      where: { id },
      relations: {
        permissions: true,
      },
    });
    return entity ? RoleMapper.toDomain(entity) : null;
  }

  async findByCode(code: string): Promise<Role | null> {
    const entity = await getTypeormRepository(this.dataSource, RoleTypeOrmEntity).findOne({
      where: { code },
      relations: {
        permissions: true,
      },
    });
    return entity ? RoleMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<Role[]> {
    const entities = await getTypeormRepository(this.dataSource, RoleTypeOrmEntity).find({
      relations: {
        permissions: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
    return entities.map((entity) => RoleMapper.toDomain(entity));
  }
}
