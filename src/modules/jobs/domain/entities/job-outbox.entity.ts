import type { AsyncJobEnvelope } from '../../../../shared/domain/ports/async-job-dispatcher.port';

export type JobOutboxStatus = 'pending' | 'claimed' | 'published' | 'completed' | 'dead';

export interface CreateJobOutboxProps<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  traceId?: string | null;
  groupKey: string;
  deduplicationKey: string;
  nextAttemptAt?: Date;
}

interface JobOutboxProps<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  traceId: string | null;
  status: JobOutboxStatus;
  attemptCount: number;
  nextAttemptAt: Date;
  publishedAt: Date | null;
  lastError: string | null;
  groupKey: string;
  deduplicationKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export class JobOutbox<TPayload = unknown> {
  public readonly id: string;
  public readonly type: string;
  public readonly payload: TPayload;
  public readonly traceId: string | null;
  public readonly status: JobOutboxStatus;
  public readonly attemptCount: number;
  public readonly nextAttemptAt: Date;
  public readonly publishedAt: Date | null;
  public readonly lastError: string | null;
  public readonly groupKey: string;
  public readonly deduplicationKey: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: JobOutboxProps<TPayload>) {
    this.id = props.id;
    this.type = props.type;
    this.payload = props.payload;
    this.traceId = props.traceId;
    this.status = props.status;
    this.attemptCount = props.attemptCount;
    this.nextAttemptAt = props.nextAttemptAt;
    this.publishedAt = props.publishedAt;
    this.lastError = props.lastError;
    this.groupKey = props.groupKey;
    this.deduplicationKey = props.deduplicationKey;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    Object.freeze(this);
  }

  static create<TPayload>(props: CreateJobOutboxProps<TPayload>): JobOutbox<TPayload> {
    const now = new Date();

    return new JobOutbox({
      id: props.id,
      type: props.type,
      payload: props.payload,
      traceId: props.traceId ?? null,
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: props.nextAttemptAt ?? now,
      publishedAt: null,
      lastError: null,
      groupKey: props.groupKey,
      deduplicationKey: props.deduplicationKey,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate<TPayload>(props: JobOutboxProps<TPayload>): JobOutbox<TPayload> {
    return new JobOutbox(props);
  }

  toEnvelope(): AsyncJobEnvelope<TPayload> {
    return {
      jobId: this.id,
      version: 1,
      type: this.type,
      payload: this.payload,
      publishedAt: (this.publishedAt ?? this.updatedAt).toISOString(),
      traceId: this.traceId,
    };
  }

  markClaimed(): JobOutbox<TPayload> {
    return new JobOutbox({
      ...this,
      status: 'claimed',
      updatedAt: new Date(),
    });
  }

  markPublished(publishedAt = new Date()): JobOutbox<TPayload> {
    return new JobOutbox({
      ...this,
      status: 'published',
      publishedAt,
      updatedAt: publishedAt,
    });
  }

  markCompleted(): JobOutbox<TPayload> {
    return new JobOutbox({
      ...this,
      status: 'completed',
      updatedAt: new Date(),
    });
  }

  scheduleRetry(lastError: string, nextAttemptAt: Date): JobOutbox<TPayload> {
    return new JobOutbox({
      ...this,
      status: 'pending',
      attemptCount: this.attemptCount + 1,
      nextAttemptAt,
      lastError,
      updatedAt: new Date(),
    });
  }

  markDead(lastError: string): JobOutbox<TPayload> {
    return new JobOutbox({
      ...this,
      status: 'dead',
      attemptCount: this.attemptCount + 1,
      lastError,
      updatedAt: new Date(),
    });
  }

  replay(now = new Date()): JobOutbox<TPayload> {
    return new JobOutbox({
      ...this,
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: now,
      publishedAt: null,
      lastError: null,
      updatedAt: now,
    });
  }
}
