import { DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { SqsAsyncJobWorker } from './sqs-async-job.worker';

describe('SqsAsyncJobWorker', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJobsEnabled = process.env.JOBS_ENABLED;
  const originalJobsQueueUrl = process.env.JOBS_SQS_QUEUE_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JOBS_ENABLED = originalJobsEnabled;
    process.env.JOBS_SQS_QUEUE_URL = originalJobsQueueUrl;
    jest.restoreAllMocks();
  });

  it('deletes poison messages when the SQS envelope is malformed', async () => {
    process.env.NODE_ENV = 'test';
    process.env.JOBS_ENABLED = 'true';
    process.env.JOBS_SQS_QUEUE_URL =
      'https://sqs.us-east-1.amazonaws.com/123456789012/hexagonal-jobs.fifo';

    const send = jest.fn().mockResolvedValue(undefined);
    const processEnvelope = jest.fn();
    const findById = jest.fn();
    const update = jest.fn();
    const worker = new SqsAsyncJobWorker(
      { send } as never,
      { process: processEnvelope } as never,
      { findById, update } as never,
    );

    await (
      worker as unknown as {
        processMessage: (message: Record<string, string>) => Promise<void>;
      }
    ).processMessage({
      Body: '{invalid-json',
      ReceiptHandle: 'receipt-1',
    });

    expect(processEnvelope).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteMessageCommand);
    expect(findById).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
