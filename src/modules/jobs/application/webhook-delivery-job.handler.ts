import { Inject, Injectable } from '@nestjs/common';
import { WEBHOOK_DELIVERY_CLIENT_TOKEN } from '../../../shared/application/ports/webhook-delivery-client.token';
import { WEBHOOK_ENDPOINT_REPOSITORY_TOKEN } from '../../../shared/application/ports/webhook-endpoint-repository.token';
import { WEBHOOK_SECRET_CIPHER_TOKEN } from '../../../shared/application/ports/webhook-secret-cipher.token';
import { TRANSACTION_RUNNER_PORT } from '../../../shared/application/ports/transaction-runner.token';
import type { TransactionRunnerPort } from '../../../shared/domain/ports/transaction-runner.port';
import { NonRetryableWebhookDeliveryError } from '../../webhooks/domain/errors/non-retryable-webhook-delivery.error';
import type { WebhookDeliveryJobPayload } from '../../webhooks/domain/webhook-delivery-job.payload';
import type { WebhookDeliveryClientPort } from '../../webhooks/domain/ports/webhook-delivery-client.port';
import type { WebhookEndpointRepositoryPort } from '../../webhooks/domain/ports/webhook-endpoint.repository.port';
import type { WebhookSecretCipherPort } from '../../webhooks/domain/ports/webhook-secret-cipher.port';
import { JobExecutionReceipt } from '../domain/entities/job-execution-receipt.entity';
import type { JobExecutionReceiptRepositoryPort } from '../domain/ports/job-execution-receipt.repository.port';
import type { JobOutboxRepositoryPort } from '../domain/ports/job-outbox.repository.port';
import { NonRetryableJobError } from './errors/non-retryable-job.error';
import { JOB_EXECUTION_RECEIPT_REPOSITORY_TOKEN } from './ports/job-execution-receipt-repository.token';
import { JobHandler, type JobHandlerCommand } from './ports/job-handler.port';
import { JOB_OUTBOX_REPOSITORY_TOKEN } from './ports/job-outbox-repository.token';

interface RetryableWebhookDeliveryError extends Error {
  statusCode?: number;
}

type WebhookHandleResult =
  | { outcome: 'completed' | 'skipped' }
  | { outcome: 'failed'; error: Error };

@Injectable()
export class WebhookDeliveryJobHandler implements JobHandler<WebhookDeliveryJobPayload> {
  readonly type = 'webhook_delivery';

  constructor(
    @Inject(WEBHOOK_ENDPOINT_REPOSITORY_TOKEN)
    private readonly webhookEndpointRepository: WebhookEndpointRepositoryPort,
    @Inject(WEBHOOK_SECRET_CIPHER_TOKEN)
    private readonly webhookSecretCipher: WebhookSecretCipherPort,
    @Inject(WEBHOOK_DELIVERY_CLIENT_TOKEN)
    private readonly webhookDeliveryClient: WebhookDeliveryClientPort,
    @Inject(JOB_EXECUTION_RECEIPT_REPOSITORY_TOKEN)
    private readonly jobExecutionReceiptRepository: JobExecutionReceiptRepositoryPort,
    @Inject(JOB_OUTBOX_REPOSITORY_TOKEN)
    private readonly jobOutboxRepository: JobOutboxRepositoryPort,
    @Inject(TRANSACTION_RUNNER_PORT)
    private readonly transactionRunner: TransactionRunnerPort,
  ) {}

  validate(payload: unknown): WebhookDeliveryJobPayload {
    if (!payload || typeof payload !== 'object') {
      throw new NonRetryableJobError('Invalid webhook delivery payload');
    }

    const candidate = payload as Partial<WebhookDeliveryJobPayload>;

    if (
      typeof candidate.eventId !== 'string' ||
      typeof candidate.eventType !== 'string' ||
      typeof candidate.organizationId !== 'string' ||
      typeof candidate.endpointId !== 'string' ||
      typeof candidate.occurredAt !== 'string' ||
      !candidate.payload ||
      typeof candidate.payload !== 'object'
    ) {
      throw new NonRetryableJobError('Invalid webhook delivery payload');
    }

    return candidate as WebhookDeliveryJobPayload;
  }

  async handle(command: JobHandlerCommand<WebhookDeliveryJobPayload>): Promise<void> {
    const result = await this.transactionRunner.runInTransaction<WebhookHandleResult>(async () => {
      const lockedJob = await this.jobOutboxRepository.findByIdForUpdate(command.jobId);

      if (!lockedJob || lockedJob.status === 'completed' || lockedJob.status === 'dead') {
        return { outcome: 'skipped' };
      }

      const receipt = await this.jobExecutionReceiptRepository.findByJobIdAndHandler(
        command.jobId,
        this.type,
      );

      if (receipt) {
        await this.jobOutboxRepository.update(lockedJob.markCompleted());

        return { outcome: 'skipped' };
      }

      const endpoint = await this.webhookEndpointRepository.findById(
        command.payload.endpointId,
        command.payload.organizationId,
      );

      if (!endpoint) {
        return {
          outcome: 'failed',
          error: new NonRetryableJobError('Webhook endpoint not found'),
        };
      }

      const secret = this.webhookSecretCipher.decrypt(endpoint.secretCiphertext);

      try {
        await this.webhookDeliveryClient.deliver({
          url: endpoint.url,
          secret,
          event: {
            id: command.payload.eventId,
            type: command.payload.eventType,
            occurredAt: command.payload.occurredAt,
            organizationId: command.payload.organizationId,
            data: command.payload.payload,
          },
        });
      } catch (error) {
        const retryableError = error as RetryableWebhookDeliveryError;

        await this.webhookEndpointRepository.update(
          endpoint.recordDeliveryFailure(
            typeof retryableError.statusCode === 'number' ? retryableError.statusCode : null,
            retryableError.message || 'Unknown webhook delivery error',
          ),
        );

        if (error instanceof NonRetryableWebhookDeliveryError) {
          return {
            outcome: 'failed',
            error: new NonRetryableJobError(error.message),
          };
        }

        return {
          outcome: 'failed',
          error: error instanceof Error ? error : new Error('Unknown webhook delivery error'),
        };
      }

      await this.webhookEndpointRepository.update(endpoint.recordDeliverySuccess());
      await this.jobExecutionReceiptRepository.create(
        JobExecutionReceipt.create({
          jobId: command.jobId,
          handler: this.type,
        }),
      );

      await this.jobOutboxRepository.update(lockedJob.markCompleted());

      return { outcome: 'completed' };
    });

    if (result.outcome === 'failed') {
      throw result.error;
    }
  }
}
