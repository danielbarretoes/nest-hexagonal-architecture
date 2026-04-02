import { FetchWebhookDeliveryClientAdapter } from './fetch-webhook-delivery-client.adapter';

describe('FetchWebhookDeliveryClientAdapter', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      WEBHOOKS_TIMEOUT_MS: '1000',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('posts signed webhook payloads successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 202,
    }) as never;

    const adapter = new FetchWebhookDeliveryClientAdapter();
    const result = await adapter.deliver({
      url: 'https://example.com/webhooks',
      secret: 'whsec_test',
      event: {
        id: 'event-1',
        type: 'iam.member.added',
        occurredAt: '2026-04-01T00:00:00.000Z',
        organizationId: 'org-1',
        data: { memberId: 'member-1' },
      },
    });

    expect(result).toEqual({ statusCode: 202 });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/webhooks',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-webhook-id': 'event-1',
          'x-webhook-event': 'iam.member.added',
        }),
      }),
    );
  });

  it('treats 5xx responses as retryable failures', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 503,
    }) as never;

    const adapter = new FetchWebhookDeliveryClientAdapter();

    await expect(
      adapter.deliver({
        url: 'https://example.com/webhooks',
        secret: 'whsec_test',
        event: {
          id: 'event-1',
          type: 'iam.member.added',
          occurredAt: '2026-04-01T00:00:00.000Z',
          organizationId: 'org-1',
          data: {},
        },
      }),
    ).rejects.toThrow('Webhook delivery failed with status 503');
  });

  it('treats 4xx responses as non-retryable failures', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 422,
    }) as never;

    const adapter = new FetchWebhookDeliveryClientAdapter();

    await expect(
      adapter.deliver({
        url: 'https://example.com/webhooks',
        secret: 'whsec_test',
        event: {
          id: 'event-1',
          type: 'iam.member.added',
          occurredAt: '2026-04-01T00:00:00.000Z',
          organizationId: 'org-1',
          data: {},
        },
      }),
    ).rejects.toThrow('Webhook delivery failed with status 422');
  });
});
