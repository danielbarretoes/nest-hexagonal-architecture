import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { getAppConfig } from '../../../../config/env/app-config';
import type {
  DeliverWebhookCommand,
  WebhookDeliveryClientPort,
  WebhookDeliveryResult,
} from '../../domain/ports/webhook-delivery-client.port';
import { NonRetryableWebhookDeliveryError } from '../../domain/errors/non-retryable-webhook-delivery.error';

class RetryableWebhookDeliveryError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
  }
}

@Injectable()
export class FetchWebhookDeliveryClientAdapter implements WebhookDeliveryClientPort {
  async deliver(command: DeliverWebhookCommand): Promise<WebhookDeliveryResult> {
    const body = JSON.stringify({
      id: command.event.id,
      type: command.event.type,
      occurredAt: command.event.occurredAt,
      organizationId: command.event.organizationId,
      data: command.event.data,
    });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac('sha256', command.secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    const response = await fetch(command.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'hexagonal-webhooks/1.0',
        'x-webhook-id': command.event.id,
        'x-webhook-event': command.event.type,
        'x-webhook-timestamp': timestamp,
        'x-webhook-signature': `t=${timestamp},v1=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(getAppConfig().webhooks.timeoutMs),
    }).catch((error: Error) => {
      throw new RetryableWebhookDeliveryError(error.message);
    });

    if (response.status >= 200 && response.status < 300) {
      return {
        statusCode: response.status,
      };
    }

    const message = `Webhook delivery failed with status ${response.status}`;

    if (
      response.status >= 500 ||
      response.status === 408 ||
      response.status === 409 ||
      response.status === 425 ||
      response.status === 429
    ) {
      throw new RetryableWebhookDeliveryError(message, response.status);
    }

    throw new NonRetryableWebhookDeliveryError(message);
  }
}
