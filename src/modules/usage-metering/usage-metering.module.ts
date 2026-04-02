import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionGuard } from '../../common/http/guards/permission.guard';
import { getAppConfig } from '../../config/env/app-config';
import { USAGE_METER_PORT } from '../../shared/application/ports/usage-meter.token';
import { IamAuthorizationAccessModule } from '../iam/iam-authorization-access.module';
import { AuthSupportModule } from '../iam/auth/auth-support.module';
import { GetApiKeyUsageSummaryUseCase } from './application/use-cases/get-api-key-usage-summary.use-case';
import { USAGE_COUNTER_REPOSITORY_TOKEN } from './application/ports/usage-counter-repository.token';
import { UsageMeterService } from './application/usage-meter.service';
import { NoopUsageMeterAdapter } from './infrastructure/adapters/noop-usage-meter.adapter';
import { UsageCounterTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/usage-counter.entity';
import { UsageCounterTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/usage-counter.typeorm-repository';
import { UsageMetricsController } from './presentation/controllers/usage-metrics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageCounterTypeOrmEntity]),
    AuthSupportModule,
    IamAuthorizationAccessModule,
  ],
  controllers: [UsageMetricsController],
  providers: [
    { provide: USAGE_COUNTER_REPOSITORY_TOKEN, useClass: UsageCounterTypeOrmRepository },
    UsageCounterTypeOrmRepository,
    UsageMeterService,
    NoopUsageMeterAdapter,
    GetApiKeyUsageSummaryUseCase,
    PermissionGuard,
    {
      provide: USAGE_METER_PORT,
      useFactory: (noopAdapter: NoopUsageMeterAdapter, usageMeterService: UsageMeterService) =>
        getAppConfig().usageMetering.enabled ? usageMeterService : noopAdapter,
      inject: [NoopUsageMeterAdapter, UsageMeterService],
    },
  ],
  exports: [USAGE_METER_PORT],
})
export class UsageMeteringModule {}
