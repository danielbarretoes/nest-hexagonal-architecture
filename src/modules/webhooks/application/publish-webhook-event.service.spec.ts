import { PublishWebhookEventService } from './publish-webhook-event.service';

describe('PublishWebhookEventService', () => {
  const findSubscribedByOrganization = jest.fn();
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    dispatch.mockResolvedValue(undefined);
  });

  it('does nothing when no endpoints are subscribed to the event', async () => {
    findSubscribedByOrganization.mockResolvedValue([]);

    const service = new PublishWebhookEventService(
      { findSubscribedByOrganization } as never,
      { dispatch } as never,
    );

    await service.publish({
      type: 'iam.member.added',
      organizationId: 'org-1',
      payload: { memberId: 'member-1' },
    });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches one delivery job per subscribed endpoint', async () => {
    findSubscribedByOrganization.mockResolvedValue([{ id: 'endpoint-1' }, { id: 'endpoint-2' }]);

    const service = new PublishWebhookEventService(
      { findSubscribedByOrganization } as never,
      { dispatch } as never,
    );

    await service.publish({
      type: 'iam.member.added',
      organizationId: 'org-1',
      traceId: 'trace-1',
      payload: { memberId: 'member-1' },
      occurredAt: new Date('2026-04-01T00:00:00.000Z'),
    });

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'webhook_delivery',
        traceId: 'trace-1',
        groupId: 'webhooks:org-1',
        payload: expect.objectContaining({
          eventType: 'iam.member.added',
          endpointId: 'endpoint-1',
        }),
      }),
    );
  });
});
