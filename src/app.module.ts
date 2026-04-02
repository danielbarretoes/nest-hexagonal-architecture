/**
 * Application Root Module
 * Configures TypeORM, multi-tenant context, tracing, and imports feature modules
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IamModule } from './modules/iam/iam.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { TenantModule } from './common/tenant/tenant.module';
import { TraceModule } from './common/observability/tracing/trace.module';
import { IdempotencyHttpModule } from './common/http/idempotency-http.module';
import { UsageMeteringHttpModule } from './common/http/usage-metering-http.module';
import { TypeormTransactionModule } from './common/infrastructure/database/typeorm/transaction/typeorm-transaction.module';
import { databaseConfig } from './config/database/database.config';
import { HealthModule } from './health/health.module';
import { UsageMeteringModule } from './modules/usage-metering/usage-metering.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    TraceModule,
    TypeormTransactionModule,
    IdempotencyHttpModule,
    UsageMeteringHttpModule,
    TenantModule,
    HealthModule,
    ObservabilityModule,
    UsageMeteringModule,
    WebhooksModule,
    IamModule,
  ],
})
export class AppModule {}
