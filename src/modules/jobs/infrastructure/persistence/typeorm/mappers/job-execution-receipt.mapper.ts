import { JobExecutionReceipt } from '../../../../domain/entities/job-execution-receipt.entity';
import { JobExecutionReceiptTypeOrmEntity } from '../entities/job-execution-receipt.entity';

export class JobExecutionReceiptMapper {
  static toDomain(entity: JobExecutionReceiptTypeOrmEntity): JobExecutionReceipt {
    return JobExecutionReceipt.rehydrate({
      jobId: entity.jobId,
      handler: entity.handler,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(receipt: JobExecutionReceipt): JobExecutionReceiptTypeOrmEntity {
    const entity = new JobExecutionReceiptTypeOrmEntity();

    entity.jobId = receipt.jobId;
    entity.handler = receipt.handler;
    entity.createdAt = receipt.createdAt;

    return entity;
  }
}
