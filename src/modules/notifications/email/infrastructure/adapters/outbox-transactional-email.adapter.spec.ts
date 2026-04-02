import { OutboxTransactionalEmailAdapter } from './outbox-transactional-email.adapter';

describe('OutboxTransactionalEmailAdapter', () => {
  it('dispatches transactional emails through the async dispatcher', async () => {
    const dispatch = jest.fn();
    const asyncJobDispatcher = { dispatch };
    const adapter = new OutboxTransactionalEmailAdapter(asyncJobDispatcher);

    await adapter.send({
      type: 'welcome',
      to: 'user@example.com',
      recipientName: 'User',
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'transactional_email',
      payload: {
        type: 'welcome',
        to: 'user@example.com',
        recipientName: 'User',
      },
      groupId: 'transactional_email',
    });
  });
});
