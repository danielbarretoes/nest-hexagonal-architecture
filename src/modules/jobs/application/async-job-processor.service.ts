import { Inject, Injectable } from '@nestjs/common';
import type { AsyncJobEnvelope } from '../../../shared/domain/ports/async-job-dispatcher.port';
import { NonRetryableJobError } from './errors/non-retryable-job.error';
import type { AsyncJobProcessorPort } from './ports/async-job-processor.port';
import { JOB_HANDLERS } from './ports/job-handler.token';
import type { JobHandler } from './ports/job-handler.port';

@Injectable()
export class AsyncJobProcessorService implements AsyncJobProcessorPort {
  constructor(
    @Inject(JOB_HANDLERS)
    private readonly jobHandlers: readonly JobHandler[],
  ) {}

  async process(job: AsyncJobEnvelope): Promise<void> {
    const jobHandler = this.jobHandlers.find((handler) => handler.type === job.type);

    if (!jobHandler) {
      throw new NonRetryableJobError(`Unsupported async job type: ${job.type}`);
    }

    const payload = jobHandler.validate(job.payload);

    await jobHandler.handle({
      jobId: job.jobId,
      traceId: job.traceId ?? null,
      payload,
    });
  }
}
