import { randomUUID } from 'node:crypto';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface CreateHttpLogProps {
  method: string;
  path: string;
  statusCode: number;
  requestBody: JsonValue | null;
  queryParams: JsonValue | null;
  routeParams: JsonValue | null;
  responseBody: JsonValue | null;
  errorMessage: string | null;
  errorTrace: string | null;
  durationMs: number;
  userId: string | null;
  organizationId: string | null;
  traceId: string | null;
  createdAt?: Date;
}

export interface RehydrateHttpLogProps extends CreateHttpLogProps {
  id: string;
  createdAt: Date;
}

export class HttpLog {
  private constructor(
    public readonly id: string,
    public readonly method: string,
    public readonly path: string,
    public readonly statusCode: number,
    public readonly requestBody: JsonValue | null,
    public readonly queryParams: JsonValue | null,
    public readonly routeParams: JsonValue | null,
    public readonly responseBody: JsonValue | null,
    public readonly errorMessage: string | null,
    public readonly errorTrace: string | null,
    public readonly durationMs: number,
    public readonly userId: string | null,
    public readonly organizationId: string | null,
    public readonly traceId: string | null,
    public readonly createdAt: Date,
  ) {}

  static create(props: CreateHttpLogProps): HttpLog {
    const method = props.method.trim().toUpperCase();
    const path = props.path.trim();

    if (!method) {
      throw new Error('HTTP method is required');
    }

    if (!path) {
      throw new Error('HTTP path is required');
    }

    if (props.statusCode < 100 || props.statusCode > 599) {
      throw new Error(`Invalid HTTP status code: ${props.statusCode}`);
    }

    if (props.durationMs < 0) {
      throw new Error('HTTP log duration cannot be negative');
    }

    return new HttpLog(
      randomUUID(),
      method,
      path,
      props.statusCode,
      props.requestBody,
      props.queryParams,
      props.routeParams,
      props.responseBody,
      props.errorMessage,
      props.errorTrace,
      props.durationMs,
      props.userId,
      props.organizationId,
      props.traceId,
      props.createdAt ?? new Date(),
    );
  }

  static rehydrate(props: RehydrateHttpLogProps): HttpLog {
    return new HttpLog(
      props.id,
      props.method.trim().toUpperCase(),
      props.path.trim(),
      props.statusCode,
      props.requestBody,
      props.queryParams,
      props.routeParams,
      props.responseBody,
      props.errorMessage,
      props.errorTrace,
      props.durationMs,
      props.userId,
      props.organizationId,
      props.traceId,
      props.createdAt,
    );
  }
}
