export interface JobsRuntimeOptions {
  readonly outboxMaxAttempts: number;
  readonly outboxRetryBaseMs: number;
  readonly outboxRetryMaxMs: number;
  readonly outboxCleanupBatchSize: number;
  readonly outboxRetentionPublishedHours: number;
  readonly outboxRetentionCompletedHours: number;
  readonly outboxRetentionDeadHours: number;
}

export const JOBS_RUNTIME_OPTIONS = Symbol('JOBS_RUNTIME_OPTIONS');
