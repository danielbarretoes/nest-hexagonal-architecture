import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { createAppDataSource } from '../../src/config/database/data-source';
import { loadEnvironment } from '../../src/config/env/load-env';

export const TEST_TABLES = [
  'audit_logs',
  'job_execution_receipts',
  'job_outbox',
  'usage_counters',
  'webhook_endpoints',
  'idempotency_requests',
  'api_keys',
  'organization_invitations',
  'user_action_tokens',
  'auth_sessions',
  'http_logs',
  'members',
  'organizations',
  'users',
] as const;
export const RLS_RUNTIME_ROLE = 'hexagonal_app_runtime';

export function useTestDatabaseEnvironment(): void {
  const overrides = {
    EMAIL_ENABLED: process.env.EMAIL_ENABLED,
    JOBS_ENABLED: process.env.JOBS_ENABLED,
    JOBS_EMAIL_DELIVERY_MODE: process.env.JOBS_EMAIL_DELIVERY_MODE,
    JOBS_SQS_QUEUE_URL: process.env.JOBS_SQS_QUEUE_URL,
  };

  loadEnvironment('test');
  process.env.DB_SYNC = 'false';
  process.env.DB_DROP_SCHEMA = 'false';
  process.env.DB_MIGRATIONS_RUN = 'false';
  process.env.DB_LOGGING = 'false';
  process.env.AUTH_EXPOSE_PRIVATE_TOKENS = 'true';
  process.env.AUTH_RATE_LIMIT_ENABLED = 'false';
  process.env.JOBS_OUTBOX_POLL_INTERVAL_MS = '10';

  Object.entries(overrides).forEach(([key, value]) => {
    if (value !== undefined) {
      process.env[key] = value;
    }
  });
}

export async function resetTestDatabase(): Promise<DataSource> {
  useTestDatabaseEnvironment();

  let lastError: unknown;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const dataSource = createAppDataSource();

    try {
      await dataSource.initialize();
      await dataSource.query('DROP SCHEMA IF EXISTS public CASCADE');
      await dataSource.query('CREATE SCHEMA public');
      await dataSource.runMigrations();
      return dataSource;
    } catch (error) {
      lastError = error;
      await dataSource.destroy().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw lastError;
}

export async function truncateIamTables(dataSource: DataSource): Promise<void> {
  const tableList = TEST_TABLES.map((table) => `"${table}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
}

export function createTestPostgresClient(): Client {
  useTestDatabaseEnvironment();

  return new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
}
