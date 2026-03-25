import { MemberTypeOrmEntity } from '../../modules/iam/organizations/infrastructure/persistence/typeorm/entities/member.entity';
import { OrganizationTypeOrmEntity } from '../../modules/iam/organizations/infrastructure/persistence/typeorm/entities/organization.entity';
import { UserTypeOrmEntity } from '../../modules/iam/users/infrastructure/persistence/typeorm/entities/user.entity';
import { HttpLogTypeOrmEntity } from '../../modules/observability/http-logs/infrastructure/persistence/typeorm/entities/http-log.entity';

export const TYPEORM_ENTITIES = [
  UserTypeOrmEntity,
  OrganizationTypeOrmEntity,
  MemberTypeOrmEntity,
  HttpLogTypeOrmEntity,
];
