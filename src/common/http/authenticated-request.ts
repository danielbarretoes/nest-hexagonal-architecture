import type { Request } from 'express';
import type { PermissionCode } from '../../shared/domain/authorization/permission-codes';

export interface AuthenticatedUserPayload {
  userId: string;
  email: string;
  authMethod?: 'jwt' | 'api_key';
  organizationId?: string;
  apiKeyId?: string;
  apiKeyName?: string;
  apiKeyScopes?: readonly PermissionCode[];
  iat?: number;
  exp?: number;
}

export interface AuthenticatedHttpRequest extends Request {
  user?: AuthenticatedUserPayload;
  effectiveOrganizationId?: string;
}
