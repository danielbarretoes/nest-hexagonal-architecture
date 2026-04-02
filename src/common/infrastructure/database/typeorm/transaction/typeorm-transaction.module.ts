import { Global, Module } from '@nestjs/common';
import { TRANSACTION_RUNNER_PORT } from '../../../../../shared/application/ports/transaction-runner.token';
import { TypeormTransactionRunnerAdapter } from './typeorm-transaction-runner.adapter';

@Global()
@Module({
  providers: [
    { provide: TRANSACTION_RUNNER_PORT, useClass: TypeormTransactionRunnerAdapter },
    TypeormTransactionRunnerAdapter,
  ],
  exports: [TRANSACTION_RUNNER_PORT],
})
export class TypeormTransactionModule {}
