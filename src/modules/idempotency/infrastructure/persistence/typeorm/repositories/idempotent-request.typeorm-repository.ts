import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { QueryFailedError, type DataSource } from 'typeorm';
import { getTypeormRepository } from '../../../../../../common/infrastructure/database/typeorm/transaction/typeorm-transaction.utils';
import type { IdempotentRequestRepositoryPort } from '../../../../domain/ports/idempotent-request.repository.port';
import type { IdempotentRequest } from '../../../../domain/entities/idempotent-request.entity';
import { IdempotentRequestTypeOrmEntity } from '../entities/idempotent-request.entity';
import { IdempotentRequestMapper } from '../mappers/idempotent-request.mapper';

function isUniqueConstraintViolation(error: unknown): boolean {
  const driverError =
    error instanceof QueryFailedError ? (error.driverError as { code?: string }) : null;
  return driverError?.code === '23505';
}

@Injectable()
export class IdempotentRequestTypeOrmRepository implements IdempotentRequestRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<IdempotentRequest | null> {
    const entity = await getTypeormRepository(
      this.dataSource,
      IdempotentRequestTypeOrmEntity,
    ).findOne({
      where: { id },
    });

    return entity ? IdempotentRequestMapper.toDomain(entity) : null;
  }

  async createPending(request: IdempotentRequest): Promise<IdempotentRequest | null> {
    const repository = getTypeormRepository(this.dataSource, IdempotentRequestTypeOrmEntity);

    try {
      const saved = await repository.save(
        repository.create(IdempotentRequestMapper.toPersistence(request)),
      );
      return IdempotentRequestMapper.toDomain(saved);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return null;
      }

      throw error;
    }
  }

  async findByUnique(
    scopeKey: string,
    idempotencyKey: string,
    method: string,
    routeKey: string,
  ): Promise<IdempotentRequest | null> {
    const entity = await getTypeormRepository(
      this.dataSource,
      IdempotentRequestTypeOrmEntity,
    ).findOne({
      where: {
        scopeKey,
        idempotencyKey,
        method,
        routeKey,
      },
    });

    return entity ? IdempotentRequestMapper.toDomain(entity) : null;
  }

  async update(request: IdempotentRequest): Promise<IdempotentRequest> {
    const repository = getTypeormRepository(this.dataSource, IdempotentRequestTypeOrmEntity);
    const saved = await repository.save(
      repository.create(IdempotentRequestMapper.toPersistence(request)),
    );

    return IdempotentRequestMapper.toDomain(saved);
  }

  async deletePending(requestId: string): Promise<void> {
    await getTypeormRepository(this.dataSource, IdempotentRequestTypeOrmEntity).delete({
      id: requestId,
      status: 'pending',
    });
  }
}
