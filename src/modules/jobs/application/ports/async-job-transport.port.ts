import type { AsyncJobEnvelope } from '../../../../shared/domain/ports/async-job-dispatcher.port';

export interface PublishAsyncJobEnvelopeCommand<TPayload = unknown> {
  envelope: AsyncJobEnvelope<TPayload>;
  groupKey: string;
  deduplicationKey: string;
}

export interface AsyncJobTransportPort {
  publish<TPayload>(command: PublishAsyncJobEnvelopeCommand<TPayload>): Promise<void>;
}
