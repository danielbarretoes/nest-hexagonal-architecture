export interface DeliverWebhookCommand {
  url: string;
  secret: string;
  event: {
    id: string;
    type: string;
    occurredAt: string;
    organizationId: string;
    data: Record<string, unknown>;
  };
}

export interface WebhookDeliveryResult {
  statusCode: number;
}

export interface WebhookDeliveryClientPort {
  deliver(command: DeliverWebhookCommand): Promise<WebhookDeliveryResult>;
}
