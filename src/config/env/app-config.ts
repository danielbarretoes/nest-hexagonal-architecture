import type { LogLevel } from '@nestjs/common';
import type { StringValue } from 'ms';
import { loadEnvironment, type RuntimeEnvironment } from './load-env';

type CorsOrigins = true | string[];

export interface AppConfig {
  nodeEnv: RuntimeEnvironment;
  port: number;
  apiBaseUrl: string;
  swaggerEnabled: boolean;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
    logging: boolean;
    dropSchema: boolean;
    migrationsRun: boolean;
    poolMax: number;
    poolMin: number;
    acquireTimeoutMs: number;
    idleTimeoutMs: number;
    sslEnabled: boolean;
    sslRejectUnauthorized: boolean;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: StringValue | number;
    refreshTokenTtlMs: number;
    exposePrivateTokens: boolean;
    rateLimitingEnabled: boolean;
    rateLimitTtlMs: number;
    rateLimitLimit: number;
  };
  apiKeys: {
    secret: string;
    defaultTtlDays: number;
    usageWriteIntervalMs: number;
  };
  usageMetering: {
    enabled: boolean;
  };
  logging: {
    serviceName: string;
    level: LogLevel;
    json: boolean;
    enabledLevels: LogLevel[];
  };
  email: {
    enabled: boolean;
    provider: 'ses';
    sesRegion: string;
    fromEmail: string;
    fromName: string;
    brandName: string;
    appPublicUrl: string;
    passwordResetPath: string;
    emailVerificationPath: string;
    invitationPath: string;
    welcomePath: string;
  };
  http: {
    helmetEnabled: boolean;
    corsEnabled: boolean;
    corsOrigins: CorsOrigins;
    bodyLimit: string;
  };
  jobs: {
    enabled: boolean;
    provider: 'sqs';
    sqsRegion: string;
    sqsQueueUrl: string;
    maxMessages: number;
    waitTimeSeconds: number;
    visibilityTimeoutSeconds: number;
    emailDeliveryMode: 'sync' | 'async';
    outboxBatchSize: number;
    outboxPollIntervalMs: number;
    outboxClaimTimeoutMs: number;
    outboxMaxAttempts: number;
    outboxRetryBaseMs: number;
    outboxRetryMaxMs: number;
    outboxCleanupEnabled: boolean;
    outboxCleanupBatchSize: number;
    outboxCleanupIntervalMs: number;
    outboxRetentionPublishedHours: number;
    outboxRetentionCompletedHours: number;
    outboxRetentionDeadHours: number;
  };
  webhooks: {
    enabled: boolean;
    timeoutMs: number;
    secretEncryptionKey: string;
  };
}

const LOG_LEVEL_ORDER: LogLevel[] = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'];

function getRequiredString(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value?.trim()) {
    throw new Error(`${name} must be defined`);
  }

  return value.trim();
}

function getBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`${name} must be either "true" or "false"`);
}

function getPositiveInteger(name: string, fallback: number): number {
  const rawValue = process.env[name];
  const value = rawValue === undefined ? fallback : Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function getNonNegativeInteger(name: string, fallback: number): number {
  const rawValue = process.env[name];
  const value = rawValue === undefined ? fallback : Number(rawValue);

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  return value;
}

function getOptionalString(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function getEnumValue<const T extends readonly string[]>(
  name: string,
  fallback: T[number],
  allowedValues: T,
): T[number] {
  const rawValue = (process.env[name] ?? fallback).trim();

  if (!allowedValues.includes(rawValue)) {
    throw new Error(`${name} must be one of: ${allowedValues.join(', ')}`);
  }

  return rawValue;
}

function getLogLevel(name: string, fallback: LogLevel): LogLevel {
  const rawValue = (process.env[name] ?? fallback).trim();
  const value = (rawValue === 'info' ? 'log' : rawValue) as LogLevel;

  if (!LOG_LEVEL_ORDER.includes(value)) {
    throw new Error(`${name} must be one of: ${LOG_LEVEL_ORDER.join(', ')}`);
  }

  return value;
}

function getEnabledLogLevels(minimumLevel: LogLevel): LogLevel[] {
  const startIndex = LOG_LEVEL_ORDER.indexOf(minimumLevel);
  return LOG_LEVEL_ORDER.slice(0, startIndex + 1);
}

function getCorsOrigins(name: string): CorsOrigins {
  const rawValue = (process.env[name] ?? '*').trim();

  if (rawValue === '*') {
    return true;
  }

  const origins = rawValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error(`${name} must be "*" or a comma-separated list of origins`);
  }

  return origins;
}

function assertValidUrl(name: string, value: string): void {
  try {
    new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
}

function assertEnvironmentInvariants(config: AppConfig): void {
  if (config.database.poolMin > config.database.poolMax) {
    throw new Error('DB_POOL_MIN cannot be greater than DB_POOL_MAX');
  }

  if (config.database.synchronize && config.database.migrationsRun) {
    throw new Error('DB_SYNC and DB_MIGRATIONS_RUN cannot both be true');
  }

  if (config.nodeEnv === 'production' && config.database.synchronize) {
    throw new Error('DB_SYNC must be false in production');
  }

  if (config.nodeEnv !== 'test' && config.database.dropSchema) {
    throw new Error('DB_DROP_SCHEMA can only be true in test');
  }

  if (config.auth.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  if (config.apiKeys.secret.length < 32) {
    throw new Error('API_KEY_SECRET must be at least 32 characters');
  }

  if (config.webhooks.enabled && config.webhooks.secretEncryptionKey.length < 32) {
    throw new Error('WEBHOOKS_SECRET_ENCRYPTION_KEY must be at least 32 characters');
  }

  if (config.nodeEnv === 'production' && config.auth.exposePrivateTokens) {
    throw new Error('AUTH_EXPOSE_PRIVATE_TOKENS must be false in production');
  }

  if (config.email.enabled) {
    assertValidUrl('APP_PUBLIC_URL', config.email.appPublicUrl);
  }

  if (config.jobs.maxMessages > 10) {
    throw new Error('JOBS_SQS_MAX_MESSAGES cannot be greater than 10');
  }

  if (config.jobs.waitTimeSeconds > 20) {
    throw new Error('JOBS_SQS_WAIT_TIME_SECONDS cannot be greater than 20');
  }

  if (config.jobs.outboxRetryBaseMs > config.jobs.outboxRetryMaxMs) {
    throw new Error('JOBS_OUTBOX_RETRY_BASE_MS cannot be greater than JOBS_OUTBOX_RETRY_MAX_MS');
  }

  if (config.jobs.outboxRetentionCompletedHours < config.jobs.outboxRetentionPublishedHours) {
    throw new Error(
      'JOBS_OUTBOX_RETENTION_COMPLETED_HOURS cannot be lower than JOBS_OUTBOX_RETENTION_PUBLISHED_HOURS',
    );
  }

  if (config.jobs.emailDeliveryMode === 'async' && !config.jobs.enabled) {
    throw new Error('JOBS_ENABLED must be true when JOBS_EMAIL_DELIVERY_MODE=async');
  }

  if (config.jobs.enabled) {
    assertValidUrl('JOBS_SQS_QUEUE_URL', config.jobs.sqsQueueUrl);
  }
}

export function getAppConfig(explicitEnvironment?: RuntimeEnvironment): AppConfig {
  const nodeEnv = loadEnvironment(explicitEnvironment);
  const apiBaseUrl = getRequiredString('API_BASE_URL', 'https://api.hexagonal.com');
  const logLevel = getLogLevel('LOG_LEVEL', nodeEnv === 'production' ? 'log' : 'debug');
  const emailEnabled = getBoolean('EMAIL_ENABLED', false);
  const configuredJwtSecret = process.env.JWT_SECRET?.trim();
  const configuredApiKeySecret = process.env.API_KEY_SECRET?.trim();
  const configuredWebhookSecret = process.env.WEBHOOKS_SECRET_ENCRYPTION_KEY?.trim();
  const jwtSecret =
    configuredJwtSecret && configuredJwtSecret.length > 0
      ? configuredJwtSecret
      : nodeEnv === 'production'
        ? ''
        : 'hexagonal-development-secret-change-before-production-use';
  const apiKeySecret =
    configuredApiKeySecret && configuredApiKeySecret.length > 0
      ? configuredApiKeySecret
      : nodeEnv === 'production'
        ? ''
        : 'hexagonal-api-key-secret-change-before-production-use';
  const webhookSecretEncryptionKey =
    configuredWebhookSecret && configuredWebhookSecret.length > 0
      ? configuredWebhookSecret
      : nodeEnv === 'production'
        ? ''
        : 'hexagonal-webhook-secret-change-before-production-use';

  assertValidUrl('API_BASE_URL', apiBaseUrl);

  const config: AppConfig = {
    nodeEnv,
    port: getPositiveInteger('PORT', nodeEnv === 'test' ? 3001 : 3000),
    apiBaseUrl,
    swaggerEnabled: getBoolean('SWAGGER_ENABLED', nodeEnv !== 'production'),
    database: {
      host: getRequiredString('DB_HOST', 'localhost'),
      port: getPositiveInteger('DB_PORT', 5432),
      username: getRequiredString('DB_USERNAME', 'postgres'),
      password: getRequiredString('DB_PASSWORD', 'postgres'),
      database: getRequiredString('DB_DATABASE', 'hexagonal_db'),
      synchronize: getBoolean('DB_SYNC', false),
      logging: getBoolean('DB_LOGGING', nodeEnv !== 'production'),
      dropSchema: getBoolean('DB_DROP_SCHEMA', false),
      migrationsRun: getBoolean('DB_MIGRATIONS_RUN', false),
      poolMax: getPositiveInteger('DB_POOL_MAX', 20),
      poolMin: getPositiveInteger('DB_POOL_MIN', 5),
      acquireTimeoutMs: getPositiveInteger('DB_ACQUIRE_TIMEOUT', 30000),
      idleTimeoutMs: getPositiveInteger('DB_IDLE_TIMEOUT', 10000),
      sslEnabled: getBoolean('DB_SSL_ENABLED', false),
      sslRejectUnauthorized: getBoolean('DB_SSL_REJECT_UNAUTHORIZED', true),
    },
    auth: {
      jwtSecret,
      jwtExpiresIn: getRequiredString('JWT_EXPIRES_IN', '15m') as StringValue,
      refreshTokenTtlMs: getPositiveInteger('AUTH_REFRESH_TOKEN_TTL_MS', 30 * 24 * 60 * 60 * 1000),
      exposePrivateTokens: getBoolean(
        'AUTH_EXPOSE_PRIVATE_TOKENS',
        nodeEnv === 'test' || (nodeEnv !== 'production' && !emailEnabled),
      ),
      rateLimitingEnabled: getBoolean('AUTH_RATE_LIMIT_ENABLED', true),
      rateLimitTtlMs: getPositiveInteger('AUTH_RATE_LIMIT_TTL_MS', 60000),
      rateLimitLimit: getPositiveInteger('AUTH_RATE_LIMIT_LIMIT', 10),
    },
    apiKeys: {
      secret: apiKeySecret,
      defaultTtlDays: getPositiveInteger('API_KEY_DEFAULT_TTL_DAYS', 90),
      usageWriteIntervalMs: getNonNegativeInteger('API_KEY_USAGE_WRITE_INTERVAL_MS', 300000),
    },
    usageMetering: {
      enabled: getBoolean('USAGE_METERING_ENABLED', true),
    },
    logging: {
      serviceName: getRequiredString('LOG_SERVICE_NAME', 'hexagonal-api'),
      level: logLevel,
      json: getBoolean('LOG_JSON', nodeEnv === 'production'),
      enabledLevels: getEnabledLogLevels(logLevel),
    },
    email: {
      enabled: emailEnabled,
      provider: 'ses',
      sesRegion: getRequiredString('EMAIL_SES_REGION', 'us-east-1'),
      fromEmail: getRequiredString('EMAIL_FROM_EMAIL', 'noreply@example.com'),
      fromName: getRequiredString('EMAIL_FROM_NAME', 'Hexagonal API'),
      brandName: getRequiredString('EMAIL_BRAND_NAME', 'Hexagonal API'),
      appPublicUrl: getRequiredString('APP_PUBLIC_URL', 'http://localhost:3000'),
      passwordResetPath: getRequiredString('EMAIL_PASSWORD_RESET_PATH', '/reset-password'),
      emailVerificationPath: getRequiredString('EMAIL_VERIFICATION_PATH', '/verify-email'),
      invitationPath: getRequiredString('EMAIL_INVITATION_PATH', '/accept-invitation'),
      welcomePath: getRequiredString('EMAIL_WELCOME_PATH', '/login'),
    },
    http: {
      helmetEnabled: getBoolean('HELMET_ENABLED', true),
      corsEnabled: getBoolean('CORS_ENABLED', true),
      corsOrigins: getCorsOrigins('CORS_ORIGINS'),
      bodyLimit: getRequiredString('HTTP_BODY_LIMIT', '1mb'),
    },
    jobs: {
      enabled: getBoolean('JOBS_ENABLED', false),
      provider: getEnumValue('JOBS_PROVIDER', 'sqs', ['sqs'] as const),
      sqsRegion: getRequiredString('JOBS_SQS_REGION', 'us-east-1'),
      sqsQueueUrl: getOptionalString('JOBS_SQS_QUEUE_URL'),
      maxMessages: getPositiveInteger('JOBS_SQS_MAX_MESSAGES', 5),
      waitTimeSeconds: getPositiveInteger('JOBS_SQS_WAIT_TIME_SECONDS', 10),
      visibilityTimeoutSeconds: getPositiveInteger('JOBS_SQS_VISIBILITY_TIMEOUT_SECONDS', 30),
      outboxBatchSize: getPositiveInteger('JOBS_OUTBOX_BATCH_SIZE', 25),
      outboxPollIntervalMs: getPositiveInteger('JOBS_OUTBOX_POLL_INTERVAL_MS', 1000),
      outboxClaimTimeoutMs: getPositiveInteger('JOBS_OUTBOX_CLAIM_TIMEOUT_MS', 60000),
      outboxMaxAttempts: getPositiveInteger('JOBS_OUTBOX_MAX_ATTEMPTS', 8),
      outboxRetryBaseMs: getPositiveInteger('JOBS_OUTBOX_RETRY_BASE_MS', 1000),
      outboxRetryMaxMs: getPositiveInteger('JOBS_OUTBOX_RETRY_MAX_MS', 60000),
      outboxCleanupEnabled: getBoolean('JOBS_OUTBOX_CLEANUP_ENABLED', false),
      outboxCleanupBatchSize: getPositiveInteger('JOBS_OUTBOX_CLEANUP_BATCH_SIZE', 200),
      outboxCleanupIntervalMs: getPositiveInteger('JOBS_OUTBOX_CLEANUP_INTERVAL_MS', 900000),
      outboxRetentionPublishedHours: getPositiveInteger(
        'JOBS_OUTBOX_RETENTION_PUBLISHED_HOURS',
        720,
      ),
      outboxRetentionCompletedHours: getPositiveInteger(
        'JOBS_OUTBOX_RETENTION_COMPLETED_HOURS',
        720,
      ),
      outboxRetentionDeadHours: getPositiveInteger('JOBS_OUTBOX_RETENTION_DEAD_HOURS', 720),
      emailDeliveryMode: getEnumValue('JOBS_EMAIL_DELIVERY_MODE', 'sync', [
        'sync',
        'async',
      ] as const),
    },
    webhooks: {
      enabled: getBoolean('WEBHOOKS_ENABLED', true),
      timeoutMs: getPositiveInteger('WEBHOOKS_TIMEOUT_MS', 10000),
      secretEncryptionKey: webhookSecretEncryptionKey,
    },
  };

  assertEnvironmentInvariants(config);

  return config;
}
