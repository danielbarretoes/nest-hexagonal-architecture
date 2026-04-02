import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { catchError, from, map, mergeMap, Observable, throwError } from 'rxjs';
import { writeStructuredLog } from '../../../common/observability/logging/structured-log.util';
import { USAGE_METER_PORT } from '../../../shared/application/ports/usage-meter.token';
import type { UsageMeterPort } from '../../../shared/domain/ports/usage-meter.port';
import type { AuthenticatedHttpRequest } from '../authenticated-request';
import { buildIdempotentRequestRouteKey } from '../idempotent-request.util';

@Injectable()
export class ApiKeyUsageMeteringInterceptor implements NestInterceptor {
  constructor(
    @Inject(USAGE_METER_PORT)
    private readonly usageMeter: UsageMeterPort,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    if (context.getType<'http'>() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedHttpRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    if (
      request.user?.authMethod !== 'api_key' ||
      !request.user.apiKeyId ||
      !request.user.organizationId
    ) {
      return next.handle();
    }

    const routeKey = buildIdempotentRequestRouteKey(request);
    const traceId =
      typeof request.headers['x-trace-id'] === 'string' ? request.headers['x-trace-id'] : null;
    const recordUsageSafely = async (statusCode: number): Promise<void> => {
      try {
        await this.usageMeter.record({
          metricKey: 'api_key.request',
          organizationId: request.user?.organizationId ?? request.effectiveOrganizationId ?? '',
          userId: request.user?.userId ?? '',
          apiKeyId: request.user?.apiKeyId,
          routeKey,
          statusCode,
          traceId,
        });
      } catch (error) {
        writeStructuredLog(
          'warn',
          ApiKeyUsageMeteringInterceptor.name,
          'Failed to record API key usage metric',
          {
            event: 'usage_metering.record.failed',
            apiKeyId: request.user?.apiKeyId ?? null,
            organizationId: request.user?.organizationId ?? request.effectiveOrganizationId ?? null,
            routeKey,
            statusCode,
            traceId,
            errorMessage: error instanceof Error ? error.message : 'Unknown metering error',
          },
        );
      }
    };

    return next.handle().pipe(
      mergeMap((body: unknown) =>
        from(recordUsageSafely(response.statusCode)).pipe(map(() => body)),
      ),
      catchError((error: unknown) =>
        from(recordUsageSafely(this.getStatusCodeFromError(error))).pipe(
          mergeMap(() => throwError(() => error)),
        ),
      ),
    );
  }

  private getStatusCodeFromError(error: unknown): number {
    return typeof (error as HttpException)?.getStatus === 'function'
      ? (error as HttpException).getStatus()
      : 500;
  }
}
