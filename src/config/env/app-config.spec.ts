describe('getAppConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      PORT: '3001',
      API_BASE_URL: 'https://api.hexagonal.test',
      SWAGGER_ENABLED: 'false',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'postgres',
      DB_DATABASE: 'hexagonal_test_db',
      DB_SYNC: 'false',
      DB_LOGGING: 'true',
      DB_DROP_SCHEMA: 'false',
      DB_MIGRATIONS_RUN: 'false',
      DB_POOL_MAX: '20',
      DB_POOL_MIN: '5',
      DB_ACQUIRE_TIMEOUT: '30000',
      DB_IDLE_TIMEOUT: '10000',
      DB_SSL_ENABLED: 'false',
      DB_SSL_REJECT_UNAUTHORIZED: 'true',
      JWT_SECRET: 'your-super-secret-key-change-in-production-minimum-32-characters',
      JWT_EXPIRES_IN: '15m',
      AUTH_REFRESH_TOKEN_TTL_MS: '2592000000',
      AUTH_EXPOSE_PRIVATE_TOKENS: 'false',
      AUTH_RATE_LIMIT_ENABLED: 'false',
      AUTH_RATE_LIMIT_TTL_MS: '60000',
      AUTH_RATE_LIMIT_LIMIT: '10',
      API_KEY_SECRET: 'your-api-key-secret-change-in-production-minimum-32-characters',
      API_KEY_DEFAULT_TTL_DAYS: '90',
      API_KEY_USAGE_WRITE_INTERVAL_MS: '300000',
      USAGE_METERING_ENABLED: 'true',
      LOG_LEVEL: 'debug',
      LOG_JSON: 'false',
      LOG_SERVICE_NAME: 'hexagonal-api-test',
      EMAIL_ENABLED: 'false',
      EMAIL_SES_REGION: 'us-east-1',
      EMAIL_FROM_EMAIL: 'noreply@hexagonal.test',
      EMAIL_FROM_NAME: 'Hexagonal Test',
      EMAIL_BRAND_NAME: 'Hexagonal Test',
      APP_PUBLIC_URL: 'https://app.hexagonal.test',
      EMAIL_PASSWORD_RESET_PATH: '/reset-password',
      EMAIL_VERIFICATION_PATH: '/verify-email',
      EMAIL_INVITATION_PATH: '/accept-invitation',
      EMAIL_WELCOME_PATH: '/login',
      JOBS_ENABLED: 'false',
      JOBS_PROVIDER: 'sqs',
      JOBS_SQS_REGION: 'us-east-1',
      JOBS_SQS_QUEUE_URL: '',
      JOBS_SQS_MAX_MESSAGES: '5',
      JOBS_SQS_WAIT_TIME_SECONDS: '10',
      JOBS_SQS_VISIBILITY_TIMEOUT_SECONDS: '30',
      JOBS_OUTBOX_BATCH_SIZE: '25',
      JOBS_OUTBOX_POLL_INTERVAL_MS: '1000',
      JOBS_OUTBOX_CLAIM_TIMEOUT_MS: '60000',
      JOBS_OUTBOX_MAX_ATTEMPTS: '8',
      JOBS_OUTBOX_RETRY_BASE_MS: '1000',
      JOBS_OUTBOX_RETRY_MAX_MS: '60000',
      JOBS_OUTBOX_CLEANUP_ENABLED: 'false',
      JOBS_OUTBOX_CLEANUP_BATCH_SIZE: '200',
      JOBS_OUTBOX_CLEANUP_INTERVAL_MS: '900000',
      JOBS_OUTBOX_RETENTION_PUBLISHED_HOURS: '720',
      JOBS_OUTBOX_RETENTION_COMPLETED_HOURS: '720',
      JOBS_OUTBOX_RETENTION_DEAD_HOURS: '720',
      JOBS_EMAIL_DELIVERY_MODE: 'sync',
      WEBHOOKS_ENABLED: 'true',
      WEBHOOKS_TIMEOUT_MS: '10000',
      WEBHOOKS_SECRET_ENCRYPTION_KEY:
        'your-webhook-secret-change-in-production-minimum-32-characters',
      HELMET_ENABLED: 'true',
      CORS_ENABLED: 'true',
      CORS_ORIGINS: 'https://app.example.com, https://admin.example.com',
      HTTP_BODY_LIMIT: '2mb',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('parses validated config into typed runtime values', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAppConfig } = require('./app-config') as typeof import('./app-config');

    const config = getAppConfig('development');

    expect(config.port).toBe(3001);
    expect(config.database.port).toBe(5432);
    expect(config.auth.rateLimitingEnabled).toBe(false);
    expect(config.auth.exposePrivateTokens).toBe(false);
    expect(config.logging.enabledLevels).toEqual(['fatal', 'error', 'warn', 'log', 'debug']);
    expect(config.logging.serviceName).toBe('hexagonal-api-test');
    expect(config.email.provider).toBe('ses');
    expect(config.email.appPublicUrl).toBe('https://app.hexagonal.test');
    expect(config.apiKeys.defaultTtlDays).toBe(90);
    expect(config.usageMetering.enabled).toBe(true);
    expect(config.jobs.emailDeliveryMode).toBe('sync');
    expect(config.jobs.outboxBatchSize).toBe(25);
    expect(config.jobs.outboxClaimTimeoutMs).toBe(60000);
    expect(config.jobs.outboxRetryMaxMs).toBe(60000);
    expect(config.jobs.outboxCleanupEnabled).toBe(false);
    expect(config.jobs.outboxCleanupBatchSize).toBe(200);
    expect(config.webhooks.enabled).toBe(true);
    expect(config.webhooks.timeoutMs).toBe(10000);
    expect(config.http.corsOrigins).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
  });

  it('rejects invalid env combinations early', async () => {
    process.env.DB_POOL_MIN = '25';
    process.env.DB_POOL_MAX = '20';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAppConfig } = require('./app-config') as typeof import('./app-config');

    expect(() => getAppConfig('development')).toThrow(
      'DB_POOL_MIN cannot be greater than DB_POOL_MAX',
    );
  });

  it('defaults to exposing private tokens in non-production when email is disabled', async () => {
    delete process.env.AUTH_EXPOSE_PRIVATE_TOKENS;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAppConfig } = require('./app-config') as typeof import('./app-config');

    expect(getAppConfig('development').auth.exposePrivateTokens).toBe(true);
  });
});
