import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ASYNC_JOB_DISPATCHER_PORT } from '../../../shared/application/ports/async-job-dispatcher.token';
import { WEBHOOK_ENDPOINT_REPOSITORY_TOKEN } from '../../../shared/application/ports/webhook-endpoint-repository.token';
import type { AsyncJobDispatcherPort } from '../../../shared/domain/ports/async-job-dispatcher.port';
import type {
  PublishWebhookEventCommand,
  WebhookEventPublisherPort,
} from '../../../shared/domain/ports/webhook-event-publisher.port';
import type { WebhookEndpointRepositoryPort } from '../domain/ports/webhook-endpoint.repository.port';
import type { WebhookDeliveryJobPayload } from '../domain/webhook-delivery-job.payload';

@Injectable()
export class PublishWebhookEventService implements WebhookEventPublisherPort {
  constructor(
    @Inject(WEBHOOK_ENDPOINT_REPOSITORY_TOKEN)
    private readonly webhookEndpointRepository: WebhookEndpointRepositoryPort,
    @Inject(ASYNC_JOB_DISPATCHER_PORT)
    private readonly asyncJobDispatcher: AsyncJobDispatcherPort,
  ) {}

  async publish<TPayload extends Record<string, unknown>>(
    command: PublishWebhookEventCommand<TPayload>,
  ): Promise<void> {
    const subscribedEndpoints = await this.webhookEndpointRepository.findSubscribedByOrganization(
      command.organizationId,
      command.type,
    );

    if (subscribedEndpoints.length === 0) {
      return;
    }

    const eventId = randomUUID();
    const occurredAt = (command.occurredAt ?? new Date()).toISOString();

    await Promise.all(
      subscribedEndpoints.map((endpoint) =>
        this.asyncJobDispatcher.dispatch<WebhookDeliveryJobPayload>({
          type: 'webhook_delivery',
          traceId: command.traceId ?? null,
          groupId: `webhooks:${command.organizationId}`,
          deduplicationId: `${eventId}:${endpoint.id}`,
          payload: {
            eventId,
            eventType: command.type,
            organizationId: command.organizationId,
            endpointId: endpoint.id,
            occurredAt,
            payload: command.payload,
          },
        }),
      ),
    );
  }
}
