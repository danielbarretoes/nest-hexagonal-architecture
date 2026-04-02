import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { catchError, from, map, mergeMap, Observable, of, throwError } from 'rxjs';
import { REQUEST_IDEMPOTENCY_PORT } from '../../../shared/application/ports/request-idempotency.token';
import type { RequestIdempotencyPort } from '../../../shared/domain/ports/request-idempotency.port';
import type { AuthenticatedHttpRequest } from '../authenticated-request';
import { IDEMPOTENT_REQUEST_METADATA_KEY } from '../decorators/idempotent.decorator';
import {
  buildIdempotentRequestHash,
  buildIdempotentRequestRouteKey,
  buildIdempotentRequestScopeKey,
} from '../idempotent-request.util';

@Injectable()
export class RequestIdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REQUEST_IDEMPOTENCY_PORT)
    private readonly requestIdempotency: RequestIdempotencyPort,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Promise<Observable<unknown>> {
    if (context.getType<'http'>() !== 'http') {
      return next.handle();
    }

    const isIdempotentRoute = this.reflector.getAllAndOverride<boolean>(
      IDEMPOTENT_REQUEST_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isIdempotentRoute) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedHttpRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const idempotencyKey = this.extractIdempotencyKey(request);

    if (!idempotencyKey) {
      return next.handle();
    }

    const resolution = await this.requestIdempotency.begin({
      idempotencyKey,
      scopeKey: buildIdempotentRequestScopeKey(request),
      method: request.method.toUpperCase(),
      routeKey: buildIdempotentRequestRouteKey(request),
      requestHash: buildIdempotentRequestHash(request),
    });

    if (resolution.outcome === 'replay') {
      response.status(resolution.response.statusCode);
      response.setHeader('Idempotency-Replayed', 'true');

      return of(
        resolution.response.statusCode === 204 ? undefined : (resolution.response.body ?? null),
      );
    }

    const requestId = resolution.requestId;

    return next.handle().pipe(
      mergeMap((body: unknown) =>
        from(
          this.requestIdempotency.complete({
            requestId,
            statusCode: response.statusCode,
            body: body ?? null,
          }),
        ).pipe(map(() => body)),
      ),
      // Unknown runtime failures release the lock so the caller can retry safely.
      // Domain and HTTP-level errors are re-executed on retry instead of being cached.
      catchError((error: unknown) =>
        from(this.requestIdempotency.release({ requestId })).pipe(
          mergeMap(() =>
            throwError(() => (error instanceof Error ? error : new Error('Unknown request error'))),
          ),
        ),
      ),
    );
  }

  private extractIdempotencyKey(request: AuthenticatedHttpRequest): string | null {
    const headerValue = request.headers['idempotency-key'];

    if (typeof headerValue !== 'string') {
      return null;
    }

    const normalized = headerValue.trim();

    return normalized.length > 0 ? normalized : null;
  }
}
