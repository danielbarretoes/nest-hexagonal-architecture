import type { Paginated } from '../../../../shared/domain/primitives/paginated';
import type { WebhookEndpoint } from '../entities/webhook-endpoint.entity';

export interface WebhookEndpointRepositoryPort {
  findById(id: string, organizationId: string): Promise<WebhookEndpoint | null>;
  findPaginatedByOrganization(
    organizationId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<WebhookEndpoint>>;
  findSubscribedByOrganization(
    organizationId: string,
    eventType: string,
  ): Promise<readonly WebhookEndpoint[]>;
  create(endpoint: WebhookEndpoint): Promise<WebhookEndpoint>;
  update(endpoint: WebhookEndpoint): Promise<WebhookEndpoint>;
  delete(id: string, organizationId: string): Promise<void>;
}
