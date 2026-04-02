import type { PermissionCode } from '../../../../../shared/domain/authorization/permission-codes';

export interface ApiKeyAuthenticationResult {
  userId: string;
  email: string;
  organizationId: string;
  apiKeyId: string;
  apiKeyName: string;
  scopes: readonly PermissionCode[];
}

export interface ApiKeyAuthenticatorPort {
  authenticate(token: string, remoteIp?: string | null): Promise<ApiKeyAuthenticationResult | null>;
}
