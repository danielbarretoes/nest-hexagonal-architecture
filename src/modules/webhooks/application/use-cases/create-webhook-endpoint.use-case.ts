import { Inject, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { ADMIN_AUDIT_PORT } from '../../../../shared/application/ports/admin-audit.token';
import { WEBHOOK_ENDPOINT_REPOSITORY_TOKEN } from '../../../../shared/application/ports/webhook-endpoint-repository.token';
import { WEBHOOK_SECRET_CIPHER_TOKEN } from '../../../../shared/application/ports/webhook-secret-cipher.token';
import type { AdminAuditPort } from '../../../../shared/domain/ports/admin-audit.port';
import type { WebhookEndpointRepositoryPort } from '../../domain/ports/webhook-endpoint.repository.port';
import type { WebhookSecretCipherPort } from '../../domain/ports/webhook-secret-cipher.port';
import { WebhookEndpoint } from '../../domain/entities/webhook-endpoint.entity';

export interface CreateWebhookEndpointCommand {
  organizationId: string;
  actorUserId: string;
  name: string;
  url: string;
  events: readonly string[];
}

export interface CreateWebhookEndpointResponse {
  id: string;
  name: string;
  url: string;
  events: readonly string[];
  secret: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CreateWebhookEndpointUseCase {
  constructor(
    @Inject(WEBHOOK_ENDPOINT_REPOSITORY_TOKEN)
    private readonly repository: WebhookEndpointRepositoryPort,
    @Inject(WEBHOOK_SECRET_CIPHER_TOKEN)
    private readonly webhookSecretCipher: WebhookSecretCipherPort,
    @Inject(ADMIN_AUDIT_PORT)
    private readonly adminAuditPort: AdminAuditPort,
  ) {}

  async execute(command: CreateWebhookEndpointCommand): Promise<CreateWebhookEndpointResponse> {
    const plaintextSecret = `whsec_${randomBytes(24).toString('hex')}`;
    const endpoint = await this.repository.create(
      WebhookEndpoint.create({
        id: randomUUID(),
        organizationId: command.organizationId,
        createdByUserId: command.actorUserId,
        name: command.name,
        url: command.url,
        events: command.events,
        secretCiphertext: this.webhookSecretCipher.encrypt(plaintextSecret),
      }),
    );

    await this.adminAuditPort.record({
      action: 'webhook.endpoint.created',
      actorUserId: command.actorUserId,
      organizationId: command.organizationId,
      resourceType: 'webhook_endpoint',
      resourceId: endpoint.id,
      payload: {
        name: endpoint.name,
        url: endpoint.url,
        events: endpoint.events,
      },
    });

    return {
      id: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      events: endpoint.events,
      secret: plaintextSecret,
      createdAt: endpoint.createdAt,
      updatedAt: endpoint.updatedAt,
    };
  }
}
