import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { IdempotencyAccessModule } from '../../modules/idempotency/idempotency-access.module';
import { RequestIdempotencyInterceptor } from './interceptors/request-idempotency.interceptor';

@Module({
  imports: [IdempotencyAccessModule],
  providers: [
    RequestIdempotencyInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useExisting: RequestIdempotencyInterceptor,
    },
  ],
})
export class IdempotencyHttpModule {}
