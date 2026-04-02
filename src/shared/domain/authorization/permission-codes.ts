export const PERMISSION_CODES = {
  IAM_USERS_READ: 'iam.users.read',
  IAM_USERS_WRITE: 'iam.users.write',
  IAM_ORGANIZATIONS_READ: 'iam.organizations.read',
  IAM_ORGANIZATIONS_WRITE: 'iam.organizations.write',
  IAM_MEMBERS_READ: 'iam.members.read',
  IAM_MEMBERS_WRITE: 'iam.members.write',
  IAM_API_KEYS_READ: 'iam.api_keys.read',
  IAM_API_KEYS_WRITE: 'iam.api_keys.write',
  WEBHOOKS_ENDPOINTS_READ: 'webhooks.endpoints.read',
  WEBHOOKS_ENDPOINTS_WRITE: 'webhooks.endpoints.write',
  OBSERVABILITY_HTTP_LOGS_READ: 'observability.http_logs.read',
  OBSERVABILITY_USAGE_METRICS_READ: 'observability.usage_metrics.read',
} as const;

export type PermissionCode = (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];
export const ALL_PERMISSION_CODES = Object.values(PERMISSION_CODES) as readonly PermissionCode[];
