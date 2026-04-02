import type { RuntimeEnvironment } from '../../../../../config/env/load-env';

export interface ApiKeysRuntimeOptions {
  readonly nodeEnv: RuntimeEnvironment;
  readonly defaultTtlDays: number;
  readonly usageWriteIntervalMs: number;
}

export const API_KEYS_RUNTIME_OPTIONS = Symbol('API_KEYS_RUNTIME_OPTIONS');
