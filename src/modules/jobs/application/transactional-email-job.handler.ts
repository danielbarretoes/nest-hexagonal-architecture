import { Inject, Injectable } from '@nestjs/common';
import type { TransactionalEmailPort } from '../../../shared/domain/ports/transactional-email.port';
import type { TransactionalEmailMessage } from '../../../shared/domain/ports/transactional-email.port';
import { TRANSACTION_RUNNER_PORT } from '../../../shared/application/ports/transaction-runner.token';
import type { TransactionRunnerPort } from '../../../shared/domain/ports/transaction-runner.port';
import { DIRECT_TRANSACTIONAL_EMAIL_PORT } from '../../notifications/email/email.tokens';
import { NonRetryableJobError } from './errors/non-retryable-job.error';
import { JOB_EXECUTION_RECEIPT_REPOSITORY_TOKEN } from './ports/job-execution-receipt-repository.token';
import type { JobHandler, JobHandlerCommand } from './ports/job-handler.port';
import type { JobExecutionReceiptRepositoryPort } from '../domain/ports/job-execution-receipt.repository.port';
import { JobExecutionReceipt } from '../domain/entities/job-execution-receipt.entity';
import { JOB_OUTBOX_REPOSITORY_TOKEN } from './ports/job-outbox-repository.token';
import type { JobOutboxRepositoryPort } from '../domain/ports/job-outbox.repository.port';

@Injectable()
export class TransactionalEmailJobHandler implements JobHandler<TransactionalEmailMessage> {
  readonly type = 'transactional_email';

  constructor(
    @Inject(DIRECT_TRANSACTIONAL_EMAIL_PORT)
    private readonly directTransactionalEmailPort: TransactionalEmailPort,
    @Inject(JOB_EXECUTION_RECEIPT_REPOSITORY_TOKEN)
    private readonly jobExecutionReceiptRepository: JobExecutionReceiptRepositoryPort,
    @Inject(JOB_OUTBOX_REPOSITORY_TOKEN)
    private readonly jobOutboxRepository: JobOutboxRepositoryPort,
    @Inject(TRANSACTION_RUNNER_PORT)
    private readonly transactionRunner: TransactionRunnerPort,
  ) {}

  validate(payload: unknown): TransactionalEmailMessage {
    if (!payload || typeof payload !== 'object' || !('type' in payload) || !('to' in payload)) {
      throw new NonRetryableJobError('Invalid transactional email payload');
    }

    const candidate = payload as Partial<TransactionalEmailMessage>;

    if (typeof candidate.type !== 'string' || typeof candidate.to !== 'string') {
      throw new NonRetryableJobError('Invalid transactional email payload');
    }

    switch (candidate.type) {
      case 'password_reset':
        if (
          typeof candidate.recipientName !== 'string' ||
          typeof candidate.resetToken !== 'string' ||
          typeof candidate.expiresInMinutes !== 'number'
        ) {
          throw new NonRetryableJobError('Invalid password reset payload');
        }
        return candidate as TransactionalEmailMessage;
      case 'email_verification':
        if (
          typeof candidate.recipientName !== 'string' ||
          typeof candidate.verificationToken !== 'string' ||
          typeof candidate.expiresInHours !== 'number'
        ) {
          throw new NonRetryableJobError('Invalid email verification payload');
        }
        return candidate as TransactionalEmailMessage;
      case 'organization_invitation':
        if (
          typeof candidate.organizationName !== 'string' ||
          typeof candidate.roleCode !== 'string' ||
          typeof candidate.invitationToken !== 'string' ||
          typeof candidate.expiresInDays !== 'number'
        ) {
          throw new NonRetryableJobError('Invalid organization invitation payload');
        }
        return candidate as TransactionalEmailMessage;
      case 'welcome':
        if (typeof candidate.recipientName !== 'string') {
          throw new NonRetryableJobError('Invalid welcome email payload');
        }
        return candidate as TransactionalEmailMessage;
      default:
        throw new NonRetryableJobError(
          `Unsupported transactional email type: ${String(candidate.type)}`,
        );
    }
  }

  async handle(command: JobHandlerCommand<TransactionalEmailMessage>): Promise<void> {
    await this.transactionRunner.runInTransaction(async () => {
      const lockedJob = await this.jobOutboxRepository.findByIdForUpdate(command.jobId);

      if (!lockedJob || lockedJob.status === 'completed' || lockedJob.status === 'dead') {
        return;
      }

      const existingReceipt = await this.jobExecutionReceiptRepository.findByJobIdAndHandler(
        command.jobId,
        this.type,
      );

      if (existingReceipt) {
        await this.jobOutboxRepository.update(lockedJob.markCompleted());

        return;
      }

      await this.directTransactionalEmailPort.send(command.payload);
      await this.jobExecutionReceiptRepository.create(
        JobExecutionReceipt.create({
          jobId: command.jobId,
          handler: this.type,
        }),
      );

      await this.jobOutboxRepository.update(lockedJob.markCompleted());
    });
  }
}
