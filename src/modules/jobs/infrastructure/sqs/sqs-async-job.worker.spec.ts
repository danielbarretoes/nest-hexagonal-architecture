import { DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { NonRetryableJobError } from '../../application/errors/non-retryable-job.error';
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

  it('deletes poison messages when payload validation fails downstream as non-retryable', async () => {
    process.env.NODE_ENV = 'test';
    process.env.JOBS_ENABLED = 'true';
    process.env.JOBS_SQS_QUEUE_URL =
      'https://sqs.us-east-1.amazonaws.com/123456789012/hexagonal-jobs.fifo';

    const send = jest.fn().mockResolvedValue(undefined);
    const processEnvelope = jest
      .fn()
      .mockRejectedValue(new NonRetryableJobError('Invalid transactional email payload'));
    const findById = jest.fn().mockResolvedValue(null);
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
      Body: JSON.stringify({
        version: 1,
        jobId: 'job-1',
        type: 'transactional_email',
        payload: { type: 'welcome' },
        publishedAt: '2026-04-02T08:00:00.000Z',
        traceId: null,
      }),
      ReceiptHandle: 'receipt-2',
    });

    expect(processEnvelope).toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteMessageCommand);
    expect(findById).toHaveBeenCalledWith('job-1');
    expect(update).not.toHaveBeenCalled();
  });
});
