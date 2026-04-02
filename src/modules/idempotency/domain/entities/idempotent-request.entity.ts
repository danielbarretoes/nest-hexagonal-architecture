export type IdempotentRequestStatus = 'pending' | 'completed';

export interface CreateIdempotentRequestProps {
  id: string;
  idempotencyKey: string;
  scopeKey: string;
  method: string;
  routeKey: string;
  requestHash: string;
}

interface IdempotentRequestProps extends CreateIdempotentRequestProps {
  status: IdempotentRequestStatus;
  responseStatusCode: number | null;
  responseBody: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export class IdempotentRequest {
  public readonly id: string;
  public readonly idempotencyKey: string;
  public readonly scopeKey: string;
  public readonly method: string;
  public readonly routeKey: string;
  public readonly requestHash: string;
  public readonly status: IdempotentRequestStatus;
  public readonly responseStatusCode: number | null;
  public readonly responseBody: unknown;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: IdempotentRequestProps) {
    this.id = props.id;
    this.idempotencyKey = props.idempotencyKey;
    this.scopeKey = props.scopeKey;
    this.method = props.method;
    this.routeKey = props.routeKey;
    this.requestHash = props.requestHash;
    this.status = props.status;
    this.responseStatusCode = props.responseStatusCode;
    this.responseBody = props.responseBody;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    Object.freeze(this);
  }

  static create(props: CreateIdempotentRequestProps): IdempotentRequest {
    const now = new Date();

    return new IdempotentRequest({
      ...props,
      status: 'pending',
      responseStatusCode: null,
      responseBody: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: IdempotentRequestProps): IdempotentRequest {
    return new IdempotentRequest(props);
  }

  complete(statusCode: number, body: unknown): IdempotentRequest {
    return new IdempotentRequest({
      ...this,
      status: 'completed',
      responseStatusCode: statusCode,
      responseBody: body ?? null,
      updatedAt: new Date(),
    });
  }
}
