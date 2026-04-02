import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type {
  ApiKeyUsageSummary,
  UsageCounter,
} from '../../../../domain/entities/usage-counter.entity';
import type { UsageCounterRepositoryPort } from '../../../../domain/ports/usage-counter.repository.port';
import { TypeormTransactionContext } from '../../../../../../common/infrastructure/database/typeorm/transaction/typeorm-transaction.context';

const RLS_RUNTIME_ROLE = process.env.DB_RLS_RUNTIME_ROLE || 'hexagonal_app_runtime';

interface ApiKeyUsageSummaryRow {
  apiKeyId: string;
  apiKeyName: string | null;
  routeKey: string;
  statusCode: number | string;
  totalCount: number | string;
  lastSeenAt: Date | string;
}

function isApiKeyUsageSummaryRow(value: unknown): value is ApiKeyUsageSummaryRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.apiKeyId === 'string' &&
    (candidate.apiKeyName === null || typeof candidate.apiKeyName === 'string') &&
    typeof candidate.routeKey === 'string' &&
    (typeof candidate.statusCode === 'number' || typeof candidate.statusCode === 'string') &&
    (typeof candidate.totalCount === 'number' || typeof candidate.totalCount === 'string') &&
    (candidate.lastSeenAt instanceof Date || typeof candidate.lastSeenAt === 'string')
  );
}

@Injectable()
export class UsageCounterTypeOrmRepository implements UsageCounterRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async increment(counter: UsageCounter): Promise<void> {
    await this.runWithinTenantScope(counter.organizationId, async (manager) => {
      await manager.query(
        `
          INSERT INTO "usage_counters" (
            "id",
            "metric_key",
            "bucket_start",
            "organization_id",
            "user_id",
            "api_key_id",
            "route_key",
            "status_code",
            "count",
            "last_seen_at"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (
            "metric_key",
            "bucket_start",
            "organization_id",
            "api_key_id",
            "route_key",
            "status_code"
          )
          DO UPDATE
          SET
            "count" = "usage_counters"."count" + EXCLUDED."count",
            "last_seen_at" = GREATEST("usage_counters"."last_seen_at", EXCLUDED."last_seen_at"),
            "user_id" = EXCLUDED."user_id"
        `,
        [
          randomUUID(),
          counter.metricKey,
          counter.bucketStart,
          counter.organizationId,
          counter.userId,
          counter.apiKeyId,
          counter.routeKey,
          counter.statusCode,
          counter.count,
          counter.lastSeenAt,
        ],
      );
    });
  }

  async getApiKeyRequestSummary(
    organizationId: string,
    since: Date,
    limit: number,
  ): Promise<readonly ApiKeyUsageSummary[]> {
    return this.runWithinTenantScope(organizationId, async (manager) => {
      const queryResult: unknown = await manager.query(
        `
          SELECT
            "usage"."api_key_id" AS "apiKeyId",
            MAX("api_keys"."name") AS "apiKeyName",
            "usage"."route_key" AS "routeKey",
            "usage"."status_code" AS "statusCode",
            SUM("usage"."count") AS "totalCount",
            MAX("usage"."last_seen_at") AS "lastSeenAt"
          FROM "usage_counters" AS "usage"
          LEFT JOIN "api_keys" ON "api_keys"."id" = "usage"."api_key_id"
          WHERE "usage"."organization_id" = $1
            AND "usage"."metric_key" = 'api_key.request'
            AND "usage"."bucket_start" >= $2
          GROUP BY
            "usage"."api_key_id",
            "usage"."route_key",
            "usage"."status_code"
          ORDER BY SUM("usage"."count") DESC, MAX("usage"."last_seen_at") DESC
          LIMIT $3
        `,
        [organizationId, since, limit],
      );

      const rows = Array.isArray(queryResult) ? queryResult.filter(isApiKeyUsageSummaryRow) : [];

      return rows.map((row) => ({
        apiKeyId: row.apiKeyId,
        apiKeyName: row.apiKeyName,
        routeKey: row.routeKey,
        statusCode: Number(row.statusCode),
        totalCount: Number(row.totalCount),
        lastSeenAt: new Date(row.lastSeenAt),
      }));
    });
  }

  private async runWithinTenantScope<T>(
    organizationId: string,
    operation: (manager: DataSource['manager']) => Promise<T>,
  ): Promise<T> {
    const activeManager = TypeormTransactionContext.getManager();

    if (activeManager) {
      await activeManager.query(`SET LOCAL ROLE ${RLS_RUNTIME_ROLE}`);
      await activeManager.query(`SELECT set_config('app.current_organization_id', $1, true)`, [
        organizationId,
      ]);

      return operation(activeManager);
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SET LOCAL ROLE ${RLS_RUNTIME_ROLE}`);
      await manager.query(`SELECT set_config('app.current_organization_id', $1, true)`, [
        organizationId,
      ]);

      return operation(manager);
    });
  }
}
