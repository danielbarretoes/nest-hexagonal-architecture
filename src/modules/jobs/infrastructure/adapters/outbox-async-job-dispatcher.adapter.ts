import { Inject, Injectable } from '@nestjs/common';
import type {
  AsyncJobDispatcherPort,
  DispatchAsyncJobCommand,
} from '../../../../shared/domain/ports/async-job-dispatcher.port';
import { JOB_OUTBOX_REPOSITORY_TOKEN } from '../../application/ports/job-outbox-repository.token';
import type { JobOutboxRepositoryPort } from '../../domain/ports/job-outbox.repository.port';
import { JobOutbox } from '../../domain/entities/job-outbox.entity';

@Injectable()
export class OutboxAsyncJobDispatcherAdapter implements AsyncJobDispatcherPort {
  constructor(
    @Inject(JOB_OUTBOX_REPOSITORY_TOKEN)
    private readonly jobOutboxRepository: JobOutboxRepositoryPort,
  ) {}

  async dispatch<TPayload>(command: DispatchAsyncJobCommand<TPayload>): Promise<void> {
    const nextAttemptAt = new Date(Date.now() + (command.delaySeconds ?? 0) * 1000);

    await this.jobOutboxRepository.create(
      JobOutbox.create({
        id: crypto.randomUUID(),
        type: command.type,
        payload: command.payload,
        traceId: command.traceId ?? null,
        groupKey: command.groupId ?? command.type,
        deduplicationKey: command.deduplicationId ?? crypto.randomUUID(),
        nextAttemptAt,
      }),
    );
  }
}
