/**
 * Database Configuration
 * TypeORM configuration for PostgreSQL with production-ready settings.
 */

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { TenantSubscriber } from '../../common/infrastructure/database/typeorm/subscribers/tenant.subscriber';
import { getAppConfig } from '../env/app-config';
import { TYPEORM_ENTITIES } from './typeorm.entities';
import { TYPEORM_MIGRATIONS } from './typeorm.migrations';

/**
 * Database configuration factory.
 * Returns TypeORM options for PostgreSQL connection.
 */
export const createDatabaseOptions = (): DataSourceOptions => {
  const config = getAppConfig();
  const isProduction = config.nodeEnv === 'production';
  const isTest = config.nodeEnv === 'test';
  const { database } = config;

  return {
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.database,
    entities: TYPEORM_ENTITIES,
    migrations: TYPEORM_MIGRATIONS,

    // Keep synchronize as an explicit escape hatch for quick local spikes only.
    synchronize: !database.migrationsRun && !isProduction && database.synchronize,
    migrationsRun: database.migrationsRun,
    dropSchema: isTest && database.dropSchema,

    // Snake case naming strategy for PostgreSQL
    namingStrategy: new SnakeNamingStrategy(),

    // Logging configuration
    logging: database.logging,

    // Connection pool settings for production
    extra: isProduction
      ? {
          max: database.poolMax,
          min: database.poolMin,
          acquireTimeoutMillis: database.acquireTimeoutMs,
          idleTimeoutMillis: database.idleTimeoutMs,
        }
      : undefined,

    // SSL configuration for production
    ssl: database.sslEnabled
      ? {
          rejectUnauthorized: database.sslRejectUnauthorized,
        }
      : false,

    // Application-level tenant scoping hooks. Real PostgreSQL RLS policies
    // complement this with explicit database-level guarantees.
    subscribers: [TenantSubscriber],
  };
};

export const databaseConfig = (): TypeOrmModuleOptions =>
  createDatabaseOptions() as TypeOrmModuleOptions;
