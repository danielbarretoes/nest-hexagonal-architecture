import { sanitizeHttpLogErrorStack, sanitizeHttpLogPayload } from './http-log.serializer';

describe('http-log serializer', () => {
  it('redacts sensitive fields recursively', () => {
    const payload = sanitizeHttpLogPayload({
      password: 'Password123',
      nested: {
        accessToken: 'secret-token',
      },
      profile: {
        firstName: 'John',
      },
    });

    expect(payload).toEqual({
      password: '[REDACTED]',
      nested: {
        accessToken: '[REDACTED]',
      },
      profile: {
        firstName: 'John',
      },
    });
  });

  it('truncates long stacks to keep log rows bounded', () => {
    const veryLongStack = 'stack-line'.repeat(600);
    const sanitized = sanitizeHttpLogErrorStack(veryLongStack);

    expect(sanitized).toContain('...[TRUNCATED]');
    expect(sanitized?.length).toBeLessThanOrEqual(4014);
  });
});
