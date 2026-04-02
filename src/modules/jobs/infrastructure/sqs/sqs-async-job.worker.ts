import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  type Message,
  type SQSClient,
} from '@aws-sdk/client-sqs';
import { getAppConfig } from '../../../../config/env/app-config';
import { writeStructuredLog } from '../../../../common/observability/logging/structured-log.util';
import type { AsyncJobEnvelope } from '../../../../shared/domain/ports/async-job-dispatcher.port';
import { NonRetryableJobError } from '../../application/errors/non-retryable-job.error';
import { JOB_OUTBOX_REPOSITORY_TOKEN } from '../../application/ports/job-outbox-repository.token';
import { ASYNC_JOB_PROCESSOR_PORT } from '../../application/ports/async-job-processor.token';
import type { AsyncJobProcessorPort } from '../../application/ports/async-job-processor.port';
import type { JobOutboxRepositoryPort } from '../../domain/ports/job-outbox.repository.port';
import { SQS_CLIENT } from '../aws/sqs-client.token';

@Injectable()
export class SqsAsyncJobWorker implements OnModuleDestroy {
  private readonly jobsConfig = getAppConfig().jobs;
  private running = true;

  constructor(
    @Inject(SQS_CLIENT)
    private readonly sqsClient: Pick<SQSClient, 'send'>,
    @Inject(ASYNC_JOB_PROCESSOR_PORT)
    private readonly asyncJobProcessor: AsyncJobProcessorPort,
    @Inject(JOB_OUTBOX_REPOSITORY_TOKEN)
    private readonly jobOutboxRepository: JobOutboxRepositoryPort,
  ) {}

  async start(): Promise<void> {
    if (!this.jobsConfig.enabled) {
      writeStructuredLog('log', SqsAsyncJobWorker.name, 'Async jobs disabled', {
        event: 'jobs.worker.disabled',
      });
      return;
    }

    writeStructuredLog('log', SqsAsyncJobWorker.name, 'Async job worker started', {
      event: 'jobs.worker.started',
      queueUrl: this.jobsConfig.sqsQueueUrl,
      maxMessages: this.jobsConfig.maxMessages,
    });

    while (this.running) {
      try {
        const response = await this.sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: this.jobsConfig.sqsQueueUrl,
            MaxNumberOfMessages: this.jobsConfig.maxMessages,
            WaitTimeSeconds: this.jobsConfig.waitTimeSeconds,
            VisibilityTimeout: this.jobsConfig.visibilityTimeoutSeconds,
          }),
        );

        const messages = response.Messages ?? [];

        for (const message of messages) {
          if (!this.running) {
            break;
          }

          await this.processMessage(message);
        }
      } catch (error) {
        writeStructuredLog('error', SqsAsyncJobWorker.name, 'Async worker poll failed', {
          event: 'jobs.worker.poll.failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown worker error',
        });
        await this.sleep(1000);
      }
    }

    writeStructuredLog('log', SqsAsyncJobWorker.name, 'Async job worker stopped', {
      event: 'jobs.worker.stopped',
    });
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  private async processMessage(message: Message): Promise<void> {
    if (!message.Body || !message.ReceiptHandle) {
      return;
    }

    let envelope: AsyncJobEnvelope | null = null;

    try {
      envelope = this.parseEnvelope(message.Body);
      await this.asyncJobProcessor.process(envelope);
      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.jobsConfig.sqsQueueUrl,
          ReceiptHandle: message.ReceiptHandle,
        }),
      );
    } catch (error) {
      if (error instanceof NonRetryableJobError) {
        const jobOutbox = envelope ? await this.jobOutboxRepository.findById(envelope.jobId) : null;

        if (jobOutbox && jobOutbox.status !== 'completed' && jobOutbox.status !== 'dead') {
          await this.jobOutboxRepository.update(jobOutbox.markDead(error.message));
        }

        await this.sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: this.jobsConfig.sqsQueueUrl,
            ReceiptHandle: message.ReceiptHandle,
          }),
        );
      }

      writeStructuredLog('error', SqsAsyncJobWorker.name, 'Async job processing failed', {
        event: 'jobs.worker.process.failed',
        jobId: envelope?.jobId ?? null,
        jobType: envelope?.type ?? null,
        traceId: envelope?.traceId ?? null,
        errorMessage: error instanceof Error ? error.message : 'Unknown processing error',
        nonRetryable: error instanceof NonRetryableJobError,
      });
    }
  }

  private parseEnvelope(body: string): AsyncJobEnvelope {
    let parsed: Partial<AsyncJobEnvelope>;

    try {
      parsed = JSON.parse(body) as Partial<AsyncJobEnvelope>;
    } catch {
      throw new NonRetryableJobError('Invalid async job envelope');
    }

    if (
      parsed.version !== 1 ||
      typeof parsed.jobId !== 'string' ||
      typeof parsed.type !== 'string' ||
      typeof parsed.publishedAt !== 'string' ||
      (parsed.traceId !== undefined &&
        parsed.traceId !== null &&
        typeof parsed.traceId !== 'string')
    ) {
      throw new NonRetryableJobError('Invalid async job envelope');
    }

    return {
      jobId: parsed.jobId,
      version: 1,
      type: parsed.type,
      payload: parsed.payload,
      publishedAt: parsed.publishedAt,
      traceId: parsed.traceId ?? null,
    };
  }

  private async sleep(durationMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }
}
