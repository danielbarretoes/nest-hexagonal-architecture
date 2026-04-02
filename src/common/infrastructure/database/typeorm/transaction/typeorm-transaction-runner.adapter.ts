import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { TransactionRunnerPort } from '../../../../../shared/domain/ports/transaction-runner.port';
import { TypeormTransactionContext } from './typeorm-transaction.context';

@Injectable()
export class TypeormTransactionRunnerAdapter implements TransactionRunnerPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async runInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    const activeManager = TypeormTransactionContext.getManager();

    if (activeManager) {
      return operation();
    }

    return this.dataSource.transaction((manager) =>
      TypeormTransactionContext.run(manager, operation),
    );
  }
}
