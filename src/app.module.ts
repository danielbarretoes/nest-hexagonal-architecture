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
import { databaseConfig } from './config/database/database.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    TraceModule,
    TenantModule,
    ObservabilityModule,
    IamModule,
  ],
})
export class AppModule {}
