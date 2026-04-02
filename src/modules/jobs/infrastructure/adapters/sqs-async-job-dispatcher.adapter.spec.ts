import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { SqsAsyncJobDispatcherAdapter } from './sqs-async-job-dispatcher.adapter';

describe('SqsAsyncJobDispatcherAdapter', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJobsEnabled = process.env.JOBS_ENABLED;
  const originalJobsQueueUrl = process.env.JOBS_SQS_QUEUE_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JOBS_ENABLED = originalJobsEnabled;
    process.env.JOBS_SQS_QUEUE_URL = originalJobsQueueUrl;
    jest.restoreAllMocks();
  });

  it('publishes FIFO envelopes with the provided message group and deduplication id', async () => {
    process.env.NODE_ENV = 'development';
    process.env.JOBS_ENABLED = 'true';
    process.env.JOBS_SQS_QUEUE_URL =
      'https://sqs.us-east-1.amazonaws.com/123456789012/hexagonal-jobs.fifo';

    const send = jest.fn().mockResolvedValue(undefined);
    const adapter = new SqsAsyncJobDispatcherAdapter({ send });

    await adapter.publish({
      envelope: {
        jobId: 'job-1',
        version: 1,
        type: 'transactional_email',
        payload: {
          type: 'welcome',
          to: 'owner@example.com',
          recipientName: 'Owner',
        },
        publishedAt: '2026-04-01T00:00:00.000Z',
        traceId: 'trace-1',
      },
      groupKey: 'transactional_email',
      deduplicationKey: 'dedupe-1',
    });

    expect(send).toHaveBeenCalledTimes(1);

    const command = send.mock.calls[0][0] as SendMessageCommand;

    expect(command.input).toEqual(
      expect.objectContaining({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/hexagonal-jobs.fifo',
        MessageGroupId: 'transactional_email',
        MessageDeduplicationId: 'dedupe-1',
      }),
    );
    expect(command.input.MessageBody).toEqual(expect.stringContaining('"jobId":"job-1"'));
    expect(command.input.MessageBody).toEqual(
      expect.stringContaining('"type":"transactional_email"'),
    );
  });
});
