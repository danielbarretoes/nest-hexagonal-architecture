import type { HttpLog } from '../../../../domain/entities/http-log.entity';
import { HttpLogTypeOrmEntity } from '../entities/http-log.entity';
import { HttpLog as HttpLogDomain } from '../../../../domain/entities/http-log.entity';

export class HttpLogMapper {
  static toPersistence(httpLog: HttpLog): HttpLogTypeOrmEntity {
    const entity = new HttpLogTypeOrmEntity();
    entity.id = httpLog.id;
    entity.method = httpLog.method;
    entity.path = httpLog.path;
    entity.statusCode = httpLog.statusCode;
    entity.requestBody = httpLog.requestBody;
    entity.queryParams = httpLog.queryParams;
    entity.routeParams = httpLog.routeParams;
    entity.responseBody = httpLog.responseBody;
    entity.errorMessage = httpLog.errorMessage;
    entity.errorTrace = httpLog.errorTrace;
    entity.durationMs = httpLog.durationMs;
    entity.userId = httpLog.userId;
    entity.organizationId = httpLog.organizationId;
    entity.traceId = httpLog.traceId;
    entity.createdAt = httpLog.createdAt;
    return entity;
  }

  static toDomain(entity: HttpLogTypeOrmEntity): HttpLog {
    return HttpLogDomain.rehydrate({
      id: entity.id,
      method: entity.method,
      path: entity.path,
      statusCode: entity.statusCode,
      requestBody: entity.requestBody,
      queryParams: entity.queryParams,
      routeParams: entity.routeParams,
      responseBody: entity.responseBody,
      errorMessage: entity.errorMessage,
      errorTrace: entity.errorTrace,
      durationMs: entity.durationMs,
      userId: entity.userId,
      organizationId: entity.organizationId,
      traceId: entity.traceId,
      createdAt: entity.createdAt,
    });
  }
}
