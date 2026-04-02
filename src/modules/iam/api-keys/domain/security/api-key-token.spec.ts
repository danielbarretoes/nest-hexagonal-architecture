import { createApiKeyToken, parseApiKeyToken } from './api-key-token';

describe('api key token helpers', () => {
  it('creates a token with a stable environment prefix, id, secret, and prefix preview', () => {
    const token = createApiKeyToken('development');

    expect(token.id).toEqual(expect.any(String));
    expect(token.secret).toEqual(expect.any(String));
    expect(token.token).toContain(`${token.id}.`);
    expect(token.keyPrefix).toBe(`hex_test_${token.id.slice(0, 8)}`);
  });

  it('parses a valid API key token', () => {
    const token = createApiKeyToken('test');

    expect(parseApiKeyToken(token.token)).toEqual({
      id: token.id,
      secret: token.secret,
    });
  });

  it('rejects malformed API key tokens', () => {
    expect(parseApiKeyToken('')).toBeNull();
    expect(parseApiKeyToken('hex_test_only-id')).toBeNull();
    expect(parseApiKeyToken('hex_test_id.')).toBeNull();
    expect(parseApiKeyToken('just-a-random-string')).toBeNull();
  });
});
