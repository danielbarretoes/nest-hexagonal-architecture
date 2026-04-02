import type { PermissionCode } from '../../../../../shared/domain/authorization/permission-codes';

export interface CreateApiKeyProps {
  organizationId: string;
  ownerUserId: string;
  name: string;
  keyPrefix: string;
  secretHash: string;
  scopes: readonly PermissionCode[];
  expiresAt?: Date | null;
}

export class ApiKey {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly ownerUserId: string;
  public readonly name: string;
  public readonly keyPrefix: string;
  public readonly secretHash: string;
  public readonly scopes: readonly PermissionCode[];
  public readonly expiresAt: Date | null;
  public readonly lastUsedAt: Date | null;
  public readonly lastUsedIp: string | null;
  public readonly revokedAt: Date | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: {
    id: string;
    organizationId: string;
    ownerUserId: string;
    name: string;
    keyPrefix: string;
    secretHash: string;
    scopes: readonly PermissionCode[];
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    lastUsedIp: string | null;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.ownerUserId = props.ownerUserId;
    this.name = props.name;
    this.keyPrefix = props.keyPrefix;
    this.secretHash = props.secretHash;
    this.scopes = props.scopes;
    this.expiresAt = props.expiresAt;
    this.lastUsedAt = props.lastUsedAt;
    this.lastUsedIp = props.lastUsedIp;
    this.revokedAt = props.revokedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    Object.freeze(this);
  }

  static create(props: CreateApiKeyProps & { id: string }): ApiKey {
    const now = new Date();

    return new ApiKey({
      id: props.id,
      organizationId: props.organizationId,
      ownerUserId: props.ownerUserId,
      name: props.name.trim(),
      keyPrefix: props.keyPrefix,
      secretHash: props.secretHash,
      scopes: [...props.scopes],
      expiresAt: props.expiresAt ?? null,
      lastUsedAt: null,
      lastUsedIp: null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: {
    id: string;
    organizationId: string;
    ownerUserId: string;
    name: string;
    keyPrefix: string;
    secretHash: string;
    scopes: readonly PermissionCode[];
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    lastUsedIp: string | null;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ApiKey {
    return new ApiKey({
      ...props,
      scopes: [...props.scopes],
      name: props.name.trim(),
    });
  }

  get isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  get isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt.getTime() <= Date.now();
  }

  get isActive(): boolean {
    return !this.isRevoked && !this.isExpired;
  }

  revoke(): ApiKey {
    if (this.isRevoked) {
      return this;
    }

    return new ApiKey({
      ...this,
      revokedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  shouldRecordUsage(minimumIntervalMs: number): boolean {
    if (!this.lastUsedAt) {
      return true;
    }

    if (minimumIntervalMs <= 0) {
      return true;
    }

    return Date.now() - this.lastUsedAt.getTime() >= minimumIntervalMs;
  }

  recordUsage(lastUsedIp?: string | null): ApiKey {
    return new ApiKey({
      ...this,
      lastUsedAt: new Date(),
      lastUsedIp: lastUsedIp?.trim() || null,
      updatedAt: new Date(),
    });
  }
}
