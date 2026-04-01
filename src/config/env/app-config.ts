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
  logging: {
    level: LogLevel;
    json: boolean;
    enabledLevels: LogLevel[];
  };
  http: {
    helmetEnabled: boolean;
    corsEnabled: boolean;
    corsOrigins: CorsOrigins;
    bodyLimit: string;
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

  if (config.nodeEnv === 'production' && config.auth.exposePrivateTokens) {
    throw new Error('AUTH_EXPOSE_PRIVATE_TOKENS must be false in production');
  }
}

export function getAppConfig(explicitEnvironment?: RuntimeEnvironment): AppConfig {
  const nodeEnv = loadEnvironment(explicitEnvironment);
  const apiBaseUrl = getRequiredString('API_BASE_URL', 'https://api.hexagonal.com');
  const logLevel = getLogLevel('LOG_LEVEL', nodeEnv === 'production' ? 'log' : 'debug');
  const configuredJwtSecret = process.env.JWT_SECRET?.trim();
  const jwtSecret =
    configuredJwtSecret && configuredJwtSecret.length > 0
      ? configuredJwtSecret
      : nodeEnv === 'production'
        ? ''
        : 'hexagonal-development-secret-change-before-production-use';

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
      exposePrivateTokens: getBoolean('AUTH_EXPOSE_PRIVATE_TOKENS', nodeEnv === 'test'),
      rateLimitingEnabled: getBoolean('AUTH_RATE_LIMIT_ENABLED', true),
      rateLimitTtlMs: getPositiveInteger('AUTH_RATE_LIMIT_TTL_MS', 60000),
      rateLimitLimit: getPositiveInteger('AUTH_RATE_LIMIT_LIMIT', 10),
    },
    logging: {
      level: logLevel,
      json: getBoolean('LOG_JSON', nodeEnv === 'production'),
      enabledLevels: getEnabledLogLevels(logLevel),
    },
    http: {
      helmetEnabled: getBoolean('HELMET_ENABLED', true),
      corsEnabled: getBoolean('CORS_ENABLED', true),
      corsOrigins: getCorsOrigins('CORS_ORIGINS'),
      bodyLimit: getRequiredString('HTTP_BODY_LIMIT', '1mb'),
    },
  };

  assertEnvironmentInvariants(config);

  return config;
}
