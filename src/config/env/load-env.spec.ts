describe('loadEnvironment', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  it('preserves explicit process env overrides over .env.test values', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      JOBS_ENABLED: 'true',
      JOBS_EMAIL_DELIVERY_MODE: 'async',
    };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadEnvironment } = require('./load-env') as typeof import('./load-env');

    loadEnvironment();

    expect(process.env.JOBS_ENABLED).toBe('true');
    expect(process.env.JOBS_EMAIL_DELIVERY_MODE).toBe('async');
  });
});
