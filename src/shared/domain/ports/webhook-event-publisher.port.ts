export interface PublishWebhookEventCommand<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  type: string;
  organizationId: string;
  payload: TPayload;
  traceId?: string | null;
  occurredAt?: Date;
}

export interface WebhookEventPublisherPort {
  publish<TPayload extends Record<string, unknown>>(
    command: PublishWebhookEventCommand<TPayload>,
  ): Promise<void>;
}
