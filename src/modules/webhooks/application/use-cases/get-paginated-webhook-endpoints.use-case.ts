import { Inject, Injectable } from '@nestjs/common';
import { WEBHOOK_ENDPOINT_REPOSITORY_TOKEN } from '../../../../shared/application/ports/webhook-endpoint-repository.token';
import type { WebhookEndpointRepositoryPort } from '../../domain/ports/webhook-endpoint.repository.port';

@Injectable()
export class GetPaginatedWebhookEndpointsUseCase {
  constructor(
    @Inject(WEBHOOK_ENDPOINT_REPOSITORY_TOKEN)
    private readonly repository: WebhookEndpointRepositoryPort,
  ) {}

  async execute(organizationId: string, page: number, limit: number) {
    return this.repository.findPaginatedByOrganization(organizationId, page, limit);
  }
}
