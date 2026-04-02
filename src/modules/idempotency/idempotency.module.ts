import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { REQUEST_IDEMPOTENCY_PORT } from '../../shared/application/ports/request-idempotency.token';
import { RequestIdempotencyService } from './application/request-idempotency.service';
import { IDEMPOTENT_REQUEST_REPOSITORY_TOKEN } from './application/ports/idempotent-request-repository.token';
import { IdempotentRequestTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/idempotent-request.entity';
import { IdempotentRequestTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/idempotent-request.typeorm-repository';

@Module({
  imports: [TypeOrmModule.forFeature([IdempotentRequestTypeOrmEntity])],
  providers: [
    { provide: IDEMPOTENT_REQUEST_REPOSITORY_TOKEN, useClass: IdempotentRequestTypeOrmRepository },
    { provide: REQUEST_IDEMPOTENCY_PORT, useExisting: RequestIdempotencyService },
    IdempotentRequestTypeOrmRepository,
    RequestIdempotencyService,
  ],
  exports: [REQUEST_IDEMPOTENCY_PORT],
})
export class IdempotencyModule {}
