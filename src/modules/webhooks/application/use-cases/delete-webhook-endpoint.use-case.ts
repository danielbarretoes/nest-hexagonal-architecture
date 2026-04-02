import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_AUDIT_PORT } from '../../../../shared/application/ports/admin-audit.token';
import { WEBHOOK_ENDPOINT_REPOSITORY_TOKEN } from '../../../../shared/application/ports/webhook-endpoint-repository.token';
import type { AdminAuditPort } from '../../../../shared/domain/ports/admin-audit.port';
import type { WebhookEndpointRepositoryPort } from '../../domain/ports/webhook-endpoint.repository.port';

export interface DeleteWebhookEndpointCommand {
  id: string;
  organizationId: string;
  actorUserId: string;
}

@Injectable()
export class DeleteWebhookEndpointUseCase {
  constructor(
    @Inject(WEBHOOK_ENDPOINT_REPOSITORY_TOKEN)
    private readonly repository: WebhookEndpointRepositoryPort,
    @Inject(ADMIN_AUDIT_PORT)
    private readonly adminAuditPort: AdminAuditPort,
  ) {}

  async execute(command: DeleteWebhookEndpointCommand): Promise<void> {
    await this.repository.delete(command.id, command.organizationId);

    await this.adminAuditPort.record({
      action: 'webhook.endpoint.deleted',
      actorUserId: command.actorUserId,
      organizationId: command.organizationId,
      resourceType: 'webhook_endpoint',
      resourceId: command.id,
    });
  }
}
