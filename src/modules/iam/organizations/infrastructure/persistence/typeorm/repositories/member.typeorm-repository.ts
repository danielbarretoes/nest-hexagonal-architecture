/**
 * Member TypeORM Repository
 */

import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MemberTypeOrmEntity } from '../entities/member.entity';
import { MemberRepositoryPort } from '../../../../domain/ports/member.repository.port';
import { MemberMapper } from '../mappers/member.mapper';
import type { Member } from '../../../../domain/entities/member.entity';
import { Paginated } from '../../../../../../../shared/domain/primitives/paginated';
import { TenantContextRequiredException } from '../../../../../../../shared/domain/exceptions';
import { TenantContext } from '../../../../../../../common/tenant/tenant-context';
import {
  MemberByIdNotFoundException,
  MemberNotFoundException,
} from '../../../../../shared/domain/exceptions';
import {
  applyTypeormRlsContext,
  withTypeormManager,
} from '../../../../../../../common/infrastructure/database/typeorm/transaction/typeorm-rls.utils';

@Injectable()
export class MemberTypeOrmRepository implements MemberRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(MemberTypeOrmEntity)
    private readonly repository: Repository<MemberTypeOrmEntity>,
  ) {}

  private withTenantScope<T extends Record<string, string>>(baseWhere: T): T {
    const organizationId = TenantContext.getOrganizationId();

    if (!organizationId) {
      return baseWhere;
    }

    return {
      ...baseWhere,
      organizationId,
    };
  }

  private async runWithinTenantScope<T>(
    operation: (repository: Repository<MemberTypeOrmEntity>) => Promise<T>,
    organizationIdOverride?: string,
    options?: {
      allowWithoutTenant?: boolean;
    },
  ): Promise<T> {
    const organizationId = organizationIdOverride || TenantContext.getOrganizationId();

    if (!organizationId) {
      if (!options?.allowWithoutTenant) {
        throw new TenantContextRequiredException('members');
      }

      return operation(this.repository);
    }

    return withTypeormManager(this.dataSource, async (manager) => {
      await applyTypeormRlsContext(manager, {
        'app.current_organization_id': organizationId,
      });

      return operation(manager.getRepository(MemberTypeOrmEntity));
    });
  }

  async findById(id: string): Promise<Member | null> {
    const entity = await this.runWithinTenantScope((repository) =>
      repository.findOne({
        where: this.withTenantScope({ id }),
        relations: {
          user: true,
          organization: true,
          role: {
            permissions: true,
          },
        },
      }),
    );
    return entity ? MemberMapper.toDomain(entity) : null;
  }

  async findByUserAndOrganization(userId: string, organizationId: string): Promise<Member | null> {
    const entity = await this.runWithinTenantScope(
      (repository) =>
        repository.findOne({
          where: this.withTenantScope({ userId, organizationId }),
          relations: {
            user: true,
            organization: true,
            role: {
              permissions: true,
            },
          },
        }),
      organizationId,
    );
    return entity ? MemberMapper.toDomain(entity) : null;
  }

  async findByUser(userId: string): Promise<Member[]> {
    const entities = await this.runWithinTenantScope(
      (repository) =>
        repository.find({
          where: this.withTenantScope({ userId }),
          order: { joinedAt: 'DESC' },
          relations: {
            user: true,
            organization: true,
            role: {
              permissions: true,
            },
          },
        }),
      undefined,
      { allowWithoutTenant: true },
    );
    return entities.map(MemberMapper.toDomain);
  }

  async findByOrganization(organizationId: string): Promise<Member[]> {
    const entities = await this.runWithinTenantScope(
      (repository) =>
        repository.find({
          where: this.withTenantScope({ organizationId }),
          order: { joinedAt: 'DESC' },
          relations: {
            user: true,
            organization: true,
            role: {
              permissions: true,
            },
          },
        }),
      organizationId,
    );
    return entities.map(MemberMapper.toDomain);
  }

  async findPaginated(page: number, limit: number): Promise<Paginated<Member>> {
    const skip = (page - 1) * limit;
    const [entities, total] = await this.runWithinTenantScope((repository) =>
      repository.findAndCount({
        where: this.withTenantScope({}),
        skip,
        take: limit,
        order: { joinedAt: 'DESC' },
        relations: {
          user: true,
          organization: true,
          role: {
            permissions: true,
          },
        },
      }),
    );
    return Paginated.create(entities.map(MemberMapper.toDomain), total, page, limit);
  }

  async create(data: { userId: string; organizationId: string; roleId: string }): Promise<Member> {
    const fullEntity = await this.runWithinTenantScope(async (repository) => {
      const entity = repository.create({
        id: crypto.randomUUID(),
        userId: data.userId,
        organizationId: data.organizationId,
        roleId: data.roleId,
      });
      const saved = await repository.save(entity);
      return repository.findOne({
        where: { id: saved.id },
        relations: {
          user: true,
          organization: true,
          role: {
            permissions: true,
          },
        },
      });
    }, data.organizationId);

    if (!fullEntity) {
      throw new MemberNotFoundException(data.userId, data.organizationId);
    }
    return MemberMapper.toDomain(fullEntity);
  }

  async update(id: string, data: { roleId?: string }): Promise<Member> {
    const entity = await this.runWithinTenantScope(async (repository) => {
      await repository.update(id, { roleId: data.roleId });
      return repository.findOne({
        where: this.withTenantScope({ id }),
        relations: {
          user: true,
          organization: true,
          role: {
            permissions: true,
          },
        },
      });
    });

    if (!entity) {
      throw new MemberByIdNotFoundException(id);
    }

    return MemberMapper.toDomain(entity);
  }

  async delete(id: string): Promise<void> {
    await this.runWithinTenantScope(async (repository) => {
      await repository.delete(id);
    });
  }
}
