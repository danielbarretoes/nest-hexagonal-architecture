import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeormTransactionModule } from './common/infrastructure/database/typeorm/transaction/typeorm-transaction.module';
import { databaseConfig } from './config/database/database.config';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    TypeormTransactionModule,
    JobsModule,
  ],
})
export class WorkerModule {}
