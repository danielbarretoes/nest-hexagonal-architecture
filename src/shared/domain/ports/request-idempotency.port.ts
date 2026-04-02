export interface BeginIdempotentRequestCommand {
  idempotencyKey: string;
  scopeKey: string;
  method: string;
  routeKey: string;
  requestHash: string;
}

export interface ReplayableIdempotentResponse {
  statusCode: number;
  body: unknown;
}

export type BeginIdempotentRequestResult =
  | {
      outcome: 'started';
      requestId: string;
    }
  | {
      outcome: 'replay';
      response: ReplayableIdempotentResponse;
    };

export interface CompleteIdempotentRequestCommand {
  requestId: string;
  statusCode: number;
  body: unknown;
}

export interface ReleaseIdempotentRequestCommand {
  requestId: string;
}

export interface RequestIdempotencyPort {
  begin(command: BeginIdempotentRequestCommand): Promise<BeginIdempotentRequestResult>;
  complete(command: CompleteIdempotentRequestCommand): Promise<void>;
  release(command: ReleaseIdempotentRequestCommand): Promise<void>;
}
