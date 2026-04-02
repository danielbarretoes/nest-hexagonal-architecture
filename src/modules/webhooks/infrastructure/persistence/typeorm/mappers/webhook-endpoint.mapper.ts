import { WebhookEndpoint } from '../../../../domain/entities/webhook-endpoint.entity';
import { WebhookEndpointTypeOrmEntity } from '../entities/webhook-endpoint.entity';

export class WebhookEndpointMapper {
  static toDomain(entity: WebhookEndpointTypeOrmEntity): WebhookEndpoint {
    return WebhookEndpoint.rehydrate({
      id: entity.id,
      organizationId: entity.organizationId,
      createdByUserId: entity.createdByUserId,
      name: entity.name,
      url: entity.url,
      events: entity.events,
      secretCiphertext: entity.secretCiphertext,
      lastDeliveryAt: entity.lastDeliveryAt,
      lastFailureAt: entity.lastFailureAt,
      lastFailureStatusCode: entity.lastFailureStatusCode,
      lastFailureMessage: entity.lastFailureMessage,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(endpoint: WebhookEndpoint): WebhookEndpointTypeOrmEntity {
    return Object.assign(new WebhookEndpointTypeOrmEntity(), {
      id: endpoint.id,
      organizationId: endpoint.organizationId,
      createdByUserId: endpoint.createdByUserId,
      name: endpoint.name,
      url: endpoint.url,
      events: [...endpoint.events],
      secretCiphertext: endpoint.secretCiphertext,
      lastDeliveryAt: endpoint.lastDeliveryAt,
      lastFailureAt: endpoint.lastFailureAt,
      lastFailureStatusCode: endpoint.lastFailureStatusCode,
      lastFailureMessage: endpoint.lastFailureMessage,
      createdAt: endpoint.createdAt,
      updatedAt: endpoint.updatedAt,
    });
  }
}
