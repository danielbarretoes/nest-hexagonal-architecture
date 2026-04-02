export interface CreateWebhookEndpointProps {
  id: string;
  organizationId: string;
  createdByUserId: string;
  name: string;
  url: string;
  events: readonly string[];
  secretCiphertext: string;
}

interface WebhookEndpointProps extends CreateWebhookEndpointProps {
  lastDeliveryAt: Date | null;
  lastFailureAt: Date | null;
  lastFailureStatusCode: number | null;
  lastFailureMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class WebhookEndpoint {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly createdByUserId: string;
  public readonly name: string;
  public readonly url: string;
  public readonly events: readonly string[];
  public readonly secretCiphertext: string;
  public readonly lastDeliveryAt: Date | null;
  public readonly lastFailureAt: Date | null;
  public readonly lastFailureStatusCode: number | null;
  public readonly lastFailureMessage: string | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: WebhookEndpointProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.createdByUserId = props.createdByUserId;
    this.name = props.name;
    this.url = props.url;
    this.events = [...props.events];
    this.secretCiphertext = props.secretCiphertext;
    this.lastDeliveryAt = props.lastDeliveryAt;
    this.lastFailureAt = props.lastFailureAt;
    this.lastFailureStatusCode = props.lastFailureStatusCode;
    this.lastFailureMessage = props.lastFailureMessage;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    Object.freeze(this);
  }

  static create(props: CreateWebhookEndpointProps): WebhookEndpoint {
    const now = new Date();

    return new WebhookEndpoint({
      ...props,
      name: props.name.trim(),
      url: props.url.trim(),
      events: [...new Set(props.events)],
      lastDeliveryAt: null,
      lastFailureAt: null,
      lastFailureStatusCode: null,
      lastFailureMessage: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: WebhookEndpointProps): WebhookEndpoint {
    return new WebhookEndpoint({
      ...props,
      name: props.name.trim(),
      url: props.url.trim(),
      events: [...new Set(props.events)],
    });
  }

  recordDeliverySuccess(deliveredAt = new Date()): WebhookEndpoint {
    return new WebhookEndpoint({
      ...this,
      lastDeliveryAt: deliveredAt,
      lastFailureAt: null,
      lastFailureStatusCode: null,
      lastFailureMessage: null,
      updatedAt: deliveredAt,
    });
  }

  recordDeliveryFailure(
    statusCode: number | null,
    message: string,
    failedAt = new Date(),
  ): WebhookEndpoint {
    return new WebhookEndpoint({
      ...this,
      lastFailureAt: failedAt,
      lastFailureStatusCode: statusCode,
      lastFailureMessage: message,
      updatedAt: failedAt,
    });
  }
}
