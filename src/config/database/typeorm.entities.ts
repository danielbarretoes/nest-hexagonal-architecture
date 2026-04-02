import { AuthSessionTypeOrmEntity } from '../../modules/iam/auth/infrastructure/persistence/typeorm/entities/auth-session.entity';
import { UserActionTokenTypeOrmEntity } from '../../modules/iam/auth/infrastructure/persistence/typeorm/entities/user-action-token.entity';
import { ApiKeyTypeOrmEntity } from '../../modules/iam/api-keys/infrastructure/persistence/typeorm/entities/api-key.entity';
import { IdempotentRequestTypeOrmEntity } from '../../modules/idempotency/infrastructure/persistence/typeorm/entities/idempotent-request.entity';
import { MemberTypeOrmEntity } from '../../modules/iam/organizations/infrastructure/persistence/typeorm/entities/member.entity';
import { OrganizationInvitationTypeOrmEntity } from '../../modules/iam/organizations/infrastructure/persistence/typeorm/entities/organization-invitation.entity';
import { OrganizationTypeOrmEntity } from '../../modules/iam/organizations/infrastructure/persistence/typeorm/entities/organization.entity';
import { PermissionTypeOrmEntity } from '../../modules/iam/roles/infrastructure/persistence/typeorm/entities/permission.entity';
import { RoleTypeOrmEntity } from '../../modules/iam/roles/infrastructure/persistence/typeorm/entities/role.entity';
import { UserTypeOrmEntity } from '../../modules/iam/users/infrastructure/persistence/typeorm/entities/user.entity';
import { JobExecutionReceiptTypeOrmEntity } from '../../modules/jobs/infrastructure/persistence/typeorm/entities/job-execution-receipt.entity';
import { JobOutboxTypeOrmEntity } from '../../modules/jobs/infrastructure/persistence/typeorm/entities/job-outbox.entity';
import { AuditLogTypeOrmEntity } from '../../modules/observability/audit-logs/infrastructure/persistence/typeorm/entities/audit-log.entity';
import { HttpLogTypeOrmEntity } from '../../modules/observability/http-logs/infrastructure/persistence/typeorm/entities/http-log.entity';
import { UsageCounterTypeOrmEntity } from '../../modules/usage-metering/infrastructure/persistence/typeorm/entities/usage-counter.entity';
import { WebhookEndpointTypeOrmEntity } from '../../modules/webhooks/infrastructure/persistence/typeorm/entities/webhook-endpoint.entity';

export const TYPEORM_ENTITIES = [
  UserTypeOrmEntity,
  ApiKeyTypeOrmEntity,
  IdempotentRequestTypeOrmEntity,
  AuthSessionTypeOrmEntity,
  UserActionTokenTypeOrmEntity,
  JobOutboxTypeOrmEntity,
  JobExecutionReceiptTypeOrmEntity,
  OrganizationTypeOrmEntity,
  MemberTypeOrmEntity,
  OrganizationInvitationTypeOrmEntity,
  UsageCounterTypeOrmEntity,
  WebhookEndpointTypeOrmEntity,
  RoleTypeOrmEntity,
  PermissionTypeOrmEntity,
  AuditLogTypeOrmEntity,
  HttpLogTypeOrmEntity,
];
