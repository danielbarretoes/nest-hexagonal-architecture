import { Module } from '@nestjs/common';
import { PermissionGuard } from '../../../common/http/guards/permission.guard';
import { AuditLogsAccessModule } from '../../observability/audit-logs/audit-logs-access.module';
import { WebhooksAccessModule } from '../../webhooks/webhooks-access.module';
import { AuthSupportModule } from '../auth/auth-support.module';
import { IamAuthorizationAccessModule } from '../iam-authorization-access.module';
import { ApiKeysAccessModule } from './api-keys-access.module';
import { CreateApiKeyUseCase } from './application/use-cases/create-api-key.use-case';
import { GetPaginatedApiKeysUseCase } from './application/use-cases/get-paginated-api-keys.use-case';
import { RevokeApiKeyUseCase } from './application/use-cases/revoke-api-key.use-case';
import { ApiKeysController } from './presentation/controllers/api-keys.controller';

@Module({
  imports: [
    ApiKeysAccessModule,
    AuthSupportModule,
    IamAuthorizationAccessModule,
    AuditLogsAccessModule,
    WebhooksAccessModule,
  ],
  controllers: [ApiKeysController],
  providers: [
    CreateApiKeyUseCase,
    GetPaginatedApiKeysUseCase,
    RevokeApiKeyUseCase,
    PermissionGuard,
  ],
  exports: [ApiKeysAccessModule],
})
export class ApiKeysModule {}
