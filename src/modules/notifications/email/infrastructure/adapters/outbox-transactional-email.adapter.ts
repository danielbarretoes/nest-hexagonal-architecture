import { Inject, Injectable } from '@nestjs/common';
import { ASYNC_JOB_DISPATCHER_PORT } from '../../../../../shared/application/ports/async-job-dispatcher.token';
import type { AsyncJobDispatcherPort } from '../../../../../shared/domain/ports/async-job-dispatcher.port';
import type {
  TransactionalEmailMessage,
  TransactionalEmailPort,
} from '../../../../../shared/domain/ports/transactional-email.port';

@Injectable()
export class OutboxTransactionalEmailAdapter implements TransactionalEmailPort {
  constructor(
    @Inject(ASYNC_JOB_DISPATCHER_PORT)
    private readonly asyncJobDispatcher: AsyncJobDispatcherPort,
  ) {}

  async send(message: TransactionalEmailMessage): Promise<void> {
    await this.asyncJobDispatcher.dispatch({
      type: 'transactional_email',
      payload: message,
      groupId: 'transactional_email',
    });
  }
}
