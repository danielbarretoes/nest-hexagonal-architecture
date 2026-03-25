import type { JsonObject, JsonPrimitive, JsonValue } from '../../domain/entities/http-log.entity';

const REDACTED_VALUE = '[REDACTED]';
const TRUNCATED_SUFFIX = '...[TRUNCATED]';
const MAX_STRING_LENGTH = 4000;
const MAX_OBJECT_DEPTH = 6;
const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'cookies',
  'password',
  'passwordconfirmation',
  'passwordhash',
  'refreshtoken',
  'secret',
  'set-cookie',
  'token',
  'accesstoken',
]);

function truncateString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}${TRUNCATED_SUFFIX}`;
}

function tryParseJsonString(value: string): unknown {
  const trimmedValue = value.trim();

  if (
    !(trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) &&
    !(trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))
  ) {
    return value;
  }

  try {
    return JSON.parse(trimmedValue) as unknown;
  } catch {
    return value;
  }
}

function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shouldRedact(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replaceAll(/[^a-z]/g, ''));
}

function sanitizeUnknown(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): JsonValue | null {
  if (isJsonPrimitive(value)) {
    return typeof value === 'string' ? truncateString(value) : value;
  }

  if (value === undefined) {
    return null;
  }

  if (depth >= MAX_OBJECT_DEPTH) {
    return '[MAX_DEPTH_REACHED]';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Buffer.isBuffer(value)) {
    return truncateString(value.toString('utf8'));
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item, depth + 1, seen));
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return '[CIRCULAR_REFERENCE]';
    }

    seen.add(value);

    const sanitized: JsonObject = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      sanitized[key] = shouldRedact(key)
        ? REDACTED_VALUE
        : sanitizeUnknown(nestedValue, depth + 1, seen);
    }

    seen.delete(value);
    return sanitized;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateString(value.message),
    };
  }

  if (typeof value === 'symbol') {
    return truncateString(value.description ?? '[SYMBOL]');
  }

  if (typeof value === 'function') {
    return '[FUNCTION]';
  }

  return '[UNSERIALIZABLE_VALUE]';
}

export function sanitizeHttpLogPayload(value: unknown): JsonValue | null {
  if (typeof value === 'string') {
    return sanitizeUnknown(tryParseJsonString(value));
  }

  return sanitizeUnknown(value);
}

export function sanitizeHttpLogErrorStack(stack: string | undefined): string | null {
  if (!stack) {
    return null;
  }

  return truncateString(stack);
}
