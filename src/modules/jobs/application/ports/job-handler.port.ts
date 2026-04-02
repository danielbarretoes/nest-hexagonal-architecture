export interface JobHandlerCommand<TPayload> {
  jobId: string;
  traceId?: string | null;
  payload: TPayload;
}

export interface JobHandler<TPayload = unknown> {
  readonly type: string;
  validate(payload: unknown): TPayload;
  handle(command: JobHandlerCommand<TPayload>): Promise<void>;
}
