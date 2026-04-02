export class NonRetryableWebhookDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = NonRetryableWebhookDeliveryError.name;
  }
}
