import { TransactionalEmailJobHandler } from './transactional-email-job.handler';

describe('TransactionalEmailJobHandler', () => {
  const send = jest.fn();
  const findByJobIdAndHandler = jest.fn();
  const create = jest.fn();
  const findByIdForUpdate = jest.fn();
  const update = jest.fn();
  const runInTransaction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    runInTransaction.mockImplementation(async (operation: () => Promise<unknown>) => operation());
  });

  it('does not resend an email when a receipt already exists', async () => {
    findByJobIdAndHandler.mockResolvedValue({
      jobId: 'job-1',
      handler: 'transactional_email',
      createdAt: new Date(),
    });
    findByIdForUpdate.mockResolvedValue({
      id: 'job-1',
      status: 'published',
      markCompleted: () => ({
        id: 'job-1',
        status: 'completed',
      }),
    });
    update.mockResolvedValue(undefined);

    const handler = new TransactionalEmailJobHandler(
      { send } as never,
      { findByJobIdAndHandler, create } as never,
      { findByIdForUpdate, update } as never,
      { runInTransaction } as never,
    );

    await handler.handle({
      jobId: 'job-1',
      payload: {
        type: 'welcome',
        to: 'owner@example.com',
        recipientName: 'Owner',
      },
    });

    expect(send).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      id: 'job-1',
      status: 'completed',
    });
  });

  it('locks the outbox row before sending and records completion once', async () => {
    findByJobIdAndHandler.mockResolvedValue(null);
    findByIdForUpdate.mockResolvedValue({
      id: 'job-2',
      status: 'published',
      markCompleted: () => ({
        id: 'job-2',
        status: 'completed',
      }),
    });
    send.mockResolvedValue(undefined);

    const handler = new TransactionalEmailJobHandler(
      { send } as never,
      { findByJobIdAndHandler, create } as never,
      { findByIdForUpdate, update } as never,
      { runInTransaction } as never,
    );

    await handler.handle({
      jobId: 'job-2',
      payload: {
        type: 'welcome',
        to: 'owner@example.com',
        recipientName: 'Owner',
      },
    });

    expect(findByIdForUpdate).toHaveBeenCalledWith('job-2');
    expect(send).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      id: 'job-2',
      status: 'completed',
    });
  });
});
