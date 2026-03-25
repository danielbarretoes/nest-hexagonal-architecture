/**
 * Database Configuration
 * TypeORM configuration for PostgreSQL with production-ready settings.
 */

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { TenantSubscriber } from '../../common/infrastructure/database/typeorm/subscribers/tenant.subscriber';
import { TYPEORM_ENTITIES } from './typeorm.entities';
import { TYPEORM_MIGRATIONS } from './typeorm.migrations';

/**
 * Database configuration factory.
 * Returns TypeORM options for PostgreSQL connection.
 */
export const createDatabaseOptions = (): DataSourceOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  const migrationsRun = process.env.DB_MIGRATIONS_RUN === 'true';

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'hexagonal_db',
    entities: TYPEORM_ENTITIES,
    migrations: TYPEORM_MIGRATIONS,

    // Keep synchronize as an explicit escape hatch for quick local spikes only.
    synchronize: !migrationsRun && !isProduction && process.env.DB_SYNC === 'true',
    migrationsRun,
    dropSchema: isTest && process.env.DB_DROP_SCHEMA === 'true',

    // Snake case naming strategy for PostgreSQL
    namingStrategy: new SnakeNamingStrategy(),

    // Logging configuration
    logging: process.env.NODE_ENV !== 'production' && process.env.DB_LOGGING === 'true',

    // Connection pool settings for production
    extra: isProduction
      ? {
          max: parseInt(process.env.DB_POOL_MAX || '20', 10),
          min: parseInt(process.env.DB_POOL_MIN || '5', 10),
          acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000', 10),
          idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
        }
      : undefined,

    // SSL configuration for production
    ssl: isProduction ? { rejectUnauthorized: false } : false,

    // Application-level tenant scoping hooks. Real PostgreSQL RLS policies
    // complement this with explicit database-level guarantees.
    subscribers: [TenantSubscriber],
  };
};

export const databaseConfig = (): TypeOrmModuleOptions =>
  createDatabaseOptions() as TypeOrmModuleOptions;
