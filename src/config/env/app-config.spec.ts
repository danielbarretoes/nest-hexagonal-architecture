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
      LOG_LEVEL: 'debug',
      LOG_JSON: 'false',
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
    expect(config.logging.enabledLevels).toEqual(['fatal', 'error', 'warn', 'log', 'debug']);
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
});
