import { JobOutbox } from '../../../../domain/entities/job-outbox.entity';
import { JobOutboxTypeOrmEntity } from '../entities/job-outbox.entity';

export class JobOutboxMapper {
  static toDomain(entity: JobOutboxTypeOrmEntity): JobOutbox {
    return JobOutbox.rehydrate({
      id: entity.id,
      type: entity.jobType,
      payload: entity.payload,
      traceId: entity.traceId,
      status: entity.status,
      attemptCount: entity.attemptCount,
      nextAttemptAt: entity.nextAttemptAt,
      publishedAt: entity.publishedAt,
      lastError: entity.lastError,
      groupKey: entity.groupKey,
      deduplicationKey: entity.deduplicationKey,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(jobOutbox: JobOutbox): JobOutboxTypeOrmEntity {
    const entity = new JobOutboxTypeOrmEntity();

    entity.id = jobOutbox.id;
    entity.jobType = jobOutbox.type;
    entity.payload = jobOutbox.payload;
    entity.traceId = jobOutbox.traceId;
    entity.status = jobOutbox.status;
    entity.attemptCount = jobOutbox.attemptCount;
    entity.nextAttemptAt = jobOutbox.nextAttemptAt;
    entity.publishedAt = jobOutbox.publishedAt;
    entity.lastError = jobOutbox.lastError;
    entity.groupKey = jobOutbox.groupKey;
    entity.deduplicationKey = jobOutbox.deduplicationKey;
    entity.createdAt = jobOutbox.createdAt;
    entity.updatedAt = jobOutbox.updatedAt;

    return entity;
  }
}
