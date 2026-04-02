import type { PermissionCode } from '../../../../../../../shared/domain/authorization/permission-codes';
import { ApiKey } from '../../../../domain/entities/api-key.entity';
import { ApiKeyTypeOrmEntity } from '../entities/api-key.entity';

export class ApiKeyMapper {
  static toDomain(entity: ApiKeyTypeOrmEntity): ApiKey {
    return ApiKey.rehydrate({
      id: entity.id,
      organizationId: entity.organizationId,
      ownerUserId: entity.ownerUserId,
      name: entity.name,
      keyPrefix: entity.keyPrefix,
      secretHash: entity.secretHash,
      scopes: entity.scopes as PermissionCode[],
      expiresAt: entity.expiresAt,
      lastUsedAt: entity.lastUsedAt,
      lastUsedIp: entity.lastUsedIp,
      revokedAt: entity.revokedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(apiKey: ApiKey): ApiKeyTypeOrmEntity {
    const entity = new ApiKeyTypeOrmEntity();
    entity.id = apiKey.id;
    entity.organizationId = apiKey.organizationId;
    entity.ownerUserId = apiKey.ownerUserId;
    entity.name = apiKey.name;
    entity.keyPrefix = apiKey.keyPrefix;
    entity.secretHash = apiKey.secretHash;
    entity.scopes = [...apiKey.scopes];
    entity.expiresAt = apiKey.expiresAt;
    entity.lastUsedAt = apiKey.lastUsedAt;
    entity.lastUsedIp = apiKey.lastUsedIp;
    entity.revokedAt = apiKey.revokedAt;
    entity.createdAt = apiKey.createdAt;
    entity.updatedAt = apiKey.updatedAt;
    return entity;
  }
}
