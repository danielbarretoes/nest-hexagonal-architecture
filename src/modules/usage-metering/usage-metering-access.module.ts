import { Module } from '@nestjs/common';
import { UsageMeteringModule } from './usage-metering.module';

@Module({
  imports: [UsageMeteringModule],
  exports: [UsageMeteringModule],
})
export class UsageMeteringAccessModule {}
