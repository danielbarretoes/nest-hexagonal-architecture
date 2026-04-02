import { createHash } from 'node:crypto';
import type { AuthenticatedHttpRequest } from './authenticated-request';

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .reduce<Record<string, unknown>>((normalized, [key, nestedValue]) => {
        normalized[key] = normalizeValue(nestedValue);
        return normalized;
      }, {});
  }

  return value;
}

export function buildIdempotentRequestHash(request: AuthenticatedHttpRequest): string {
  const normalizedPayload = normalizeValue({
    body: (request.body as unknown) ?? null,
    params: (request.params as unknown) ?? null,
    query: (request.query as unknown) ?? null,
  });

  return createHash('sha256').update(JSON.stringify(normalizedPayload)).digest('hex');
}

export function buildIdempotentRequestRouteKey(request: AuthenticatedHttpRequest): string {
  const baseUrl = typeof request.baseUrl === 'string' ? request.baseUrl : '';
  const route = request.route as { path?: unknown } | undefined;
  const routePath =
    route && typeof route.path === 'string'
      ? route.path
      : request.path || request.originalUrl || '';

  return `${baseUrl}${routePath}` || '/';
}

export function buildIdempotentRequestScopeKey(request: AuthenticatedHttpRequest): string {
  const organizationId = request.effectiveOrganizationId || request.user?.organizationId || null;
  const authScope = request.user?.apiKeyId
    ? `api_key:${request.user.apiKeyId}`
    : request.user?.userId
      ? `user:${request.user.userId}`
      : request.ip
        ? `ip:${request.ip}`
        : 'anonymous';

  return organizationId ? `${authScope}|org:${organizationId}` : authScope;
}
