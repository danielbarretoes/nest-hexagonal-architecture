import { IdempotentRequest } from '../../../../domain/entities/idempotent-request.entity';
import { IdempotentRequestTypeOrmEntity } from '../entities/idempotent-request.entity';

export class IdempotentRequestMapper {
  static toDomain(entity: IdempotentRequestTypeOrmEntity): IdempotentRequest {
    return IdempotentRequest.rehydrate({
      id: entity.id,
      idempotencyKey: entity.idempotencyKey,
      scopeKey: entity.scopeKey,
      method: entity.method,
      routeKey: entity.routeKey,
      requestHash: entity.requestHash,
      status: entity.status,
      responseStatusCode: entity.responseStatusCode,
      responseBody: entity.responseBody,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(request: IdempotentRequest): IdempotentRequestTypeOrmEntity {
    return {
      id: request.id,
      idempotencyKey: request.idempotencyKey,
      scopeKey: request.scopeKey,
      method: request.method,
      routeKey: request.routeKey,
      requestHash: request.requestHash,
      status: request.status,
      responseStatusCode: request.responseStatusCode,
      responseBody: request.responseBody,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }
}
