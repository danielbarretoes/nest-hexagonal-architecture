import { getAppConfig } from '../env/app-config';

export function getAuthRuntimeConfig() {
  const { auth } = getAppConfig();

  return {
    exposePrivateTokens: auth.exposePrivateTokens,
    rateLimitingEnabled: auth.rateLimitingEnabled,
    rateLimitTtlMs: auth.rateLimitTtlMs,
    rateLimitLimit: auth.rateLimitLimit,
    refreshSessionTtlMs: auth.refreshTokenTtlMs,
  } as const;
}
