import { Injectable } from '@nestjs/common';
import type { WebhookEventPublisherPort } from '../../../shared/domain/ports/webhook-event-publisher.port';

@Injectable()
export class NoopWebhookEventPublisherAdapter implements WebhookEventPublisherPort {
  async publish(): Promise<void> {}
}
