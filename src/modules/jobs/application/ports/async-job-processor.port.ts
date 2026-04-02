import type { AsyncJobEnvelope } from '../../../../shared/domain/ports/async-job-dispatcher.port';

export interface AsyncJobProcessorPort {
  process(job: AsyncJobEnvelope): Promise<void>;
}
