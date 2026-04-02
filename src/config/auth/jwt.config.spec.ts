describe('getJwtConfig', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalApiKeySecret = process.env.API_KEY_SECRET;

  afterEach(() => {
    jest.resetModules();

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }

    if (originalApiKeySecret === undefined) {
      delete process.env.API_KEY_SECRET;
    } else {
      process.env.API_KEY_SECRET = originalApiKeySecret;
    }
  });

  it('throws when JWT_SECRET is missing in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = '';
    process.env.API_KEY_SECRET = 'your-api-key-secret-change-in-production-minimum-32-characters';

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const configModule = require('./jwt.config') as typeof import('./jwt.config');
      configModule.getJwtConfig();
    }).toThrow('JWT_SECRET must be at least 32 characters');
  });

  it('uses the development fallback secret outside production', async () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = '';
    process.env.API_KEY_SECRET = 'your-api-key-secret-change-in-production-minimum-32-characters';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const configModule = require('./jwt.config') as typeof import('./jwt.config');

    expect(configModule.getJwtConfig().secret).toBe(
      'hexagonal-development-secret-change-before-production-use',
    );
  });
});
