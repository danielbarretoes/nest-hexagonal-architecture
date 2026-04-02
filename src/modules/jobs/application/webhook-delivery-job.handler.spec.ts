import { NonRetryableWebhookDeliveryError } from '../../webhooks/domain/errors/non-retryable-webhook-delivery.error';
import { WebhookDeliveryJobHandler } from './webhook-delivery-job.handler';

describe('WebhookDeliveryJobHandler', () => {
  const findByJobIdAndHandler = jest.fn();
  const create = jest.fn();
  const findEndpointById = jest.fn();
  const updateEndpoint = jest.fn();
  const findJobByIdForUpdate = jest.fn();
  const updateJob = jest.fn();
  const decrypt = jest.fn();
  const deliver = jest.fn();
  const runInTransaction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    runInTransaction.mockImplementation(async (operation: () => Promise<unknown>) => operation());
  });

  it('marks already-received jobs as completed without redelivery', async () => {
    findByJobIdAndHandler.mockResolvedValue({
      jobId: 'job-1',
      handler: 'webhook_delivery',
      createdAt: new Date(),
    });
    findJobByIdForUpdate.mockResolvedValue({
      id: 'job-1',
      status: 'published',
      markCompleted: () => ({
        id: 'job-1',
        status: 'completed',
      }),
    });

    const handler = new WebhookDeliveryJobHandler(
      { findById: findEndpointById, update: updateEndpoint } as never,
      { decrypt } as never,
      { deliver } as never,
      { findByJobIdAndHandler, create } as never,
      { findByIdForUpdate: findJobByIdForUpdate, update: updateJob } as never,
      { runInTransaction } as never,
    );

    await handler.handle({
      jobId: 'job-1',
      payload: {
        eventId: 'event-1',
        eventType: 'iam.member.added',
        organizationId: 'org-1',
        endpointId: 'endpoint-1',
        occurredAt: '2026-04-01T00:00:00.000Z',
        payload: {},
      },
    });

    expect(deliver).not.toHaveBeenCalled();
    expect(updateJob).toHaveBeenCalledWith({
      id: 'job-1',
      status: 'completed',
    });
  });

  it('delivers webhook events and records a receipt', async () => {
    findByJobIdAndHandler.mockResolvedValue(null);
    findJobByIdForUpdate.mockResolvedValue({
      id: 'job-1',
      status: 'published',
      markCompleted: () => ({
        id: 'job-1',
        status: 'completed',
      }),
    });
    findEndpointById.mockResolvedValue({
      id: 'endpoint-1',
      organizationId: 'org-1',
      url: 'https://example.com/webhooks',
      secretCiphertext: 'cipher',
      recordDeliverySuccess: () => ({
        id: 'endpoint-1',
        delivered: true,
      }),
    });
    decrypt.mockReturnValue('whsec_test');
    deliver.mockResolvedValue({ statusCode: 202 });

    const handler = new WebhookDeliveryJobHandler(
      { findById: findEndpointById, update: updateEndpoint } as never,
      { decrypt } as never,
      { deliver } as never,
      { findByJobIdAndHandler, create } as never,
      { findByIdForUpdate: findJobByIdForUpdate, update: updateJob } as never,
      { runInTransaction } as never,
    );

    await handler.handle({
      jobId: 'job-1',
      payload: {
        eventId: 'event-1',
        eventType: 'iam.member.added',
        organizationId: 'org-1',
        endpointId: 'endpoint-1',
        occurredAt: '2026-04-01T00:00:00.000Z',
        payload: { memberId: 'member-1' },
      },
    });

    expect(deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/webhooks',
        secret: 'whsec_test',
      }),
    );
    expect(findJobByIdForUpdate).toHaveBeenCalledWith('job-1');
    expect(create).toHaveBeenCalled();
    expect(updateEndpoint).toHaveBeenCalledWith({
      id: 'endpoint-1',
      delivered: true,
    });
    expect(updateJob).toHaveBeenCalledWith({
      id: 'job-1',
      status: 'completed',
    });
  });

  it('maps non-retryable delivery failures into non-retryable job errors', async () => {
    findByJobIdAndHandler.mockResolvedValue(null);
    findJobByIdForUpdate.mockResolvedValue({
      id: 'job-1',
      status: 'published',
      markCompleted: () => ({
        id: 'job-1',
        status: 'completed',
      }),
    });
    findEndpointById.mockResolvedValue({
      id: 'endpoint-1',
      organizationId: 'org-1',
      url: 'https://example.com/webhooks',
      secretCiphertext: 'cipher',
      recordDeliveryFailure: () => ({
        id: 'endpoint-1',
        failed: true,
      }),
    });
    decrypt.mockReturnValue('whsec_test');
    deliver.mockRejectedValue(new NonRetryableWebhookDeliveryError('Webhook delivery failed'));

    const handler = new WebhookDeliveryJobHandler(
      { findById: findEndpointById, update: updateEndpoint } as never,
      { decrypt } as never,
      { deliver } as never,
      { findByJobIdAndHandler, create } as never,
      { findByIdForUpdate: findJobByIdForUpdate, update: updateJob } as never,
      { runInTransaction } as never,
    );

    await expect(
      handler.handle({
        jobId: 'job-1',
        payload: {
          eventId: 'event-1',
          eventType: 'iam.member.added',
          organizationId: 'org-1',
          endpointId: 'endpoint-1',
          occurredAt: '2026-04-01T00:00:00.000Z',
          payload: {},
        },
      }),
    ).rejects.toThrow('Webhook delivery failed');

    expect(updateEndpoint).toHaveBeenCalledWith({
      id: 'endpoint-1',
      failed: true,
    });
  });
});
