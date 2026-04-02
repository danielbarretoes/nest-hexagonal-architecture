export interface AsyncJobEnvelope<TPayload = unknown> {
  jobId: string;
  version: 1;
  type: string;
  payload: TPayload;
  publishedAt: string;
  traceId?: string | null;
}

export interface DispatchAsyncJobCommand<TPayload = unknown> {
  type: string;
  payload: TPayload;
  traceId?: string | null;
  delaySeconds?: number;
  deduplicationId?: string;
  groupId?: string;
}

export interface AsyncJobDispatcherPort {
  dispatch<TPayload>(command: DispatchAsyncJobCommand<TPayload>): Promise<void>;
}
