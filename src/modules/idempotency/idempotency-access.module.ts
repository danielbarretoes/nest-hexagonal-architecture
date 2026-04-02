import { Module } from '@nestjs/common';
import { IdempotencyModule } from './idempotency.module';

@Module({
  imports: [IdempotencyModule],
  exports: [IdempotencyModule],
})
export class IdempotencyAccessModule {}
