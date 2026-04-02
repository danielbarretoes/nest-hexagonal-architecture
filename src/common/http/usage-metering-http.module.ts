import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { UsageMeteringAccessModule } from '../../modules/usage-metering/usage-metering-access.module';
import { ApiKeyUsageMeteringInterceptor } from './interceptors/api-key-usage-metering.interceptor';

@Module({
  imports: [UsageMeteringAccessModule],
  providers: [
    ApiKeyUsageMeteringInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useExisting: ApiKeyUsageMeteringInterceptor,
    },
  ],
})
export class UsageMeteringHttpModule {}
