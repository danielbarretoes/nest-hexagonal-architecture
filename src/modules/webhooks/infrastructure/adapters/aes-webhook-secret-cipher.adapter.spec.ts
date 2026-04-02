import { AesWebhookSecretCipherAdapter } from './aes-webhook-secret-cipher.adapter';

describe('AesWebhookSecretCipherAdapter', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      WEBHOOKS_SECRET_ENCRYPTION_KEY:
        'your-webhook-secret-change-in-production-minimum-32-characters',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('encrypts and decrypts webhook secrets symmetrically', async () => {
    const adapter = new AesWebhookSecretCipherAdapter();
    const ciphertext = adapter.encrypt('whsec_test_secret');

    expect(ciphertext).not.toBe('whsec_test_secret');
    expect(adapter.decrypt(ciphertext)).toBe('whsec_test_secret');
  });

  it('rejects malformed ciphertext payloads', async () => {
    const adapter = new AesWebhookSecretCipherAdapter();

    expect(() => adapter.decrypt('not-valid')).toThrow('Invalid webhook secret ciphertext');
  });
});
