import { Injectable } from '@nestjs/common';
import { writeStructuredLog } from '../../../../common/observability/logging/structured-log.util';
import type {
  AsyncJobDispatcherPort,
  DispatchAsyncJobCommand,
} from '../../../../shared/domain/ports/async-job-dispatcher.port';

@Injectable()
export class NoopAsyncJobDispatcherAdapter implements AsyncJobDispatcherPort {
  async dispatch<TPayload>(command: DispatchAsyncJobCommand<TPayload>): Promise<void> {
    writeStructuredLog('debug', NoopAsyncJobDispatcherAdapter.name, 'Async job dropped', {
      event: 'jobs.dispatch.skipped',
      jobType: command.type,
      traceId: command.traceId ?? null,
    });
  }
}
