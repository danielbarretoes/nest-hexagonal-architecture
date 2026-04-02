import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { JobExecutionReceiptRepositoryPort } from '../../../../domain/ports/job-execution-receipt.repository.port';
import type { JobExecutionReceipt } from '../../../../domain/entities/job-execution-receipt.entity';
import { getTypeormRepository } from '../../../../../../common/infrastructure/database/typeorm/transaction/typeorm-transaction.utils';
import { JobExecutionReceiptMapper } from '../mappers/job-execution-receipt.mapper';
import { JobExecutionReceiptTypeOrmEntity } from '../entities/job-execution-receipt.entity';

@Injectable()
export class JobExecutionReceiptTypeOrmRepository implements JobExecutionReceiptRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findByJobIdAndHandler(jobId: string, handler: string): Promise<JobExecutionReceipt | null> {
    const entity = await getTypeormRepository(
      this.dataSource,
      JobExecutionReceiptTypeOrmEntity,
    ).findOne({
      where: {
        jobId,
        handler,
      },
    });

    return entity ? JobExecutionReceiptMapper.toDomain(entity) : null;
  }

  async create(receipt: JobExecutionReceipt): Promise<JobExecutionReceipt> {
    const repository = getTypeormRepository(this.dataSource, JobExecutionReceiptTypeOrmEntity);
    const saved = await repository.save(
      repository.create(JobExecutionReceiptMapper.toPersistence(receipt)),
    );

    return JobExecutionReceiptMapper.toDomain(saved);
  }
}
