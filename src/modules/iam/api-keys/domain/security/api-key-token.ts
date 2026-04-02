import type { RuntimeEnvironment } from '../../../../../config/env/load-env';
import { randomBytes } from 'node:crypto';

const API_KEY_PREFIX_BY_ENVIRONMENT: Record<RuntimeEnvironment, string> = {
  development: 'hex_test',
  test: 'hex_test',
  production: 'hex_live',
};

export interface ApiKeyTokenParts {
  id: string;
  secret: string;
  token: string;
  keyPrefix: string;
}

export function createApiKeyToken(environment: RuntimeEnvironment): ApiKeyTokenParts {
  const id = crypto.randomUUID();
  const secret = randomBytes(32).toString('base64url');
  const prefix = API_KEY_PREFIX_BY_ENVIRONMENT[environment];

  return {
    id,
    secret,
    token: `${prefix}_${id}.${secret}`,
    keyPrefix: `${prefix}_${id.slice(0, 8)}`,
  };
}

export function parseApiKeyToken(token: string): { id: string; secret: string } | null {
  const [prefixedId, secret] = token.split('.');

  if (!prefixedId || !secret) {
    return null;
  }

  const prefixSeparator = prefixedId.lastIndexOf('_');

  if (prefixSeparator === -1) {
    return null;
  }

  const id = prefixedId.slice(prefixSeparator + 1);

  if (!id || !secret) {
    return null;
  }

  return { id, secret };
}
