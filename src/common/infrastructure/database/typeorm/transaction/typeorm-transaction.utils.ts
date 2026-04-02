import type { DataSource, EntityManager, EntityTarget, Repository } from 'typeorm';
import { TypeormTransactionContext } from './typeorm-transaction.context';

export function getTypeormEntityManager(dataSource: DataSource): EntityManager {
  return TypeormTransactionContext.getManager() ?? dataSource.manager;
}

export function getTypeormRepository<TEntity extends object>(
  dataSource: DataSource,
  entity: EntityTarget<TEntity>,
): Repository<TEntity> {
  return getTypeormEntityManager(dataSource).getRepository(entity);
}
