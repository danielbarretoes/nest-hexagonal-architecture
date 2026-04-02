export interface WebhookDeliveryJobPayload {
  eventId: string;
  eventType: string;
  organizationId: string;
  endpointId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}
