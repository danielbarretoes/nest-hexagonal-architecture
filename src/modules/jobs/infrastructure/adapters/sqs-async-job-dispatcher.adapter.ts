import { Inject, Injectable } from '@nestjs/common';
import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';
import { getAppConfig } from '../../../../config/env/app-config';
import type {
  AsyncJobTransportPort,
  PublishAsyncJobEnvelopeCommand,
} from '../../application/ports/async-job-transport.port';
import { SQS_CLIENT } from '../aws/sqs-client.token';

@Injectable()
export class SqsAsyncJobDispatcherAdapter implements AsyncJobTransportPort {
  private readonly jobsConfig = getAppConfig().jobs;

  constructor(
    @Inject(SQS_CLIENT)
    private readonly sqsClient: Pick<SQSClient, 'send'>,
  ) {}

  async publish<TPayload>(command: PublishAsyncJobEnvelopeCommand<TPayload>): Promise<void> {
    const isFifoQueue = this.jobsConfig.sqsQueueUrl.endsWith('.fifo');

    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: this.jobsConfig.sqsQueueUrl,
        MessageBody: JSON.stringify(command.envelope),
        MessageGroupId: isFifoQueue ? command.groupKey : undefined,
        MessageDeduplicationId: isFifoQueue ? command.deduplicationKey : undefined,
      }),
    );
  }
}
