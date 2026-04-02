import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionGuard } from '../../common/http/guards/permission.guard';
import { getAppConfig } from '../../config/env/app-config';
import { WEBHOOK_DELIVERY_CLIENT_TOKEN } from '../../shared/application/ports/webhook-delivery-client.token';
import { WEBHOOK_ENDPOINT_REPOSITORY_TOKEN } from '../../shared/application/ports/webhook-endpoint-repository.token';
import { WEBHOOK_SECRET_CIPHER_TOKEN } from '../../shared/application/ports/webhook-secret-cipher.token';
import { WEBHOOK_EVENT_PUBLISHER_PORT } from '../../shared/application/ports/webhook-event-publisher.token';
import { AuthSupportModule } from '../iam/auth/auth-support.module';
import { IamAuthorizationAccessModule } from '../iam/iam-authorization-access.module';
import { JobsAccessModule } from '../jobs/jobs-access.module';
import { AuditLogsAccessModule } from '../observability/audit-logs/audit-logs-access.module';
import { CreateWebhookEndpointUseCase } from './application/use-cases/create-webhook-endpoint.use-case';
import { DeleteWebhookEndpointUseCase } from './application/use-cases/delete-webhook-endpoint.use-case';
import { GetPaginatedWebhookEndpointsUseCase } from './application/use-cases/get-paginated-webhook-endpoints.use-case';
import { NoopWebhookEventPublisherAdapter } from './application/noop-webhook-event-publisher.adapter';
import { PublishWebhookEventService } from './application/publish-webhook-event.service';
import { AesWebhookSecretCipherAdapter } from './infrastructure/adapters/aes-webhook-secret-cipher.adapter';
import { FetchWebhookDeliveryClientAdapter } from './infrastructure/adapters/fetch-webhook-delivery-client.adapter';
import { WebhookEndpointTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/webhook-endpoint.entity';
import { WebhookEndpointTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/webhook-endpoint.typeorm-repository';
import { WebhooksController } from './presentation/controllers/webhooks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEndpointTypeOrmEntity]),
    JobsAccessModule,
    AuditLogsAccessModule,
    AuthSupportModule,
    IamAuthorizationAccessModule,
  ],
  controllers: [WebhooksController],
  providers: [
    { provide: WEBHOOK_ENDPOINT_REPOSITORY_TOKEN, useClass: WebhookEndpointTypeOrmRepository },
    { provide: WEBHOOK_SECRET_CIPHER_TOKEN, useClass: AesWebhookSecretCipherAdapter },
    { provide: WEBHOOK_DELIVERY_CLIENT_TOKEN, useClass: FetchWebhookDeliveryClientAdapter },
    WebhookEndpointTypeOrmRepository,
    AesWebhookSecretCipherAdapter,
    FetchWebhookDeliveryClientAdapter,
    CreateWebhookEndpointUseCase,
    DeleteWebhookEndpointUseCase,
    GetPaginatedWebhookEndpointsUseCase,
    PermissionGuard,
    NoopWebhookEventPublisherAdapter,
    PublishWebhookEventService,
    {
      provide: WEBHOOK_EVENT_PUBLISHER_PORT,
      useFactory: (
        noopPublisher: NoopWebhookEventPublisherAdapter,
        publishWebhookEventService: PublishWebhookEventService,
      ) => (getAppConfig().webhooks.enabled ? publishWebhookEventService : noopPublisher),
      inject: [NoopWebhookEventPublisherAdapter, PublishWebhookEventService],
    },
  ],
  exports: [
    WEBHOOK_EVENT_PUBLISHER_PORT,
    WEBHOOK_ENDPOINT_REPOSITORY_TOKEN,
    WEBHOOK_SECRET_CIPHER_TOKEN,
    WEBHOOK_DELIVERY_CLIENT_TOKEN,
  ],
})
export class WebhooksModule {}
