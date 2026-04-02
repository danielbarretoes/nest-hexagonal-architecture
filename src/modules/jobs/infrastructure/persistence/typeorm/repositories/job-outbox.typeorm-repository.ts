import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { getAppConfig } from '../../../../../../config/env/app-config';
import type { DataSource } from 'typeorm';
import type { JobOutboxRepositoryPort } from '../../../../domain/ports/job-outbox.repository.port';
import type { JobOutbox, JobOutboxStatus } from '../../../../domain/entities/job-outbox.entity';
import {
  getTypeormEntityManager,
  getTypeormRepository,
} from '../../../../../../common/infrastructure/database/typeorm/transaction/typeorm-transaction.utils';
import { JobOutboxMapper } from '../mappers/job-outbox.mapper';
import { JobOutboxTypeOrmEntity } from '../entities/job-outbox.entity';

interface JobOutboxRow {
  id: string;
  jobType: string;
  payload: unknown;
  traceId: string | null;
  status: JobOutboxStatus;
  attemptCount: number | string;
  nextAttemptAt: Date | string;
  publishedAt: Date | string | null;
  lastError: string | null;
  groupKey: string;
  deduplicationKey: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface JobOutboxIdRow {
  id: string;
}

function isDateLike(value: unknown): value is Date | string {
  return value instanceof Date || typeof value === 'string';
}

function isJobOutboxStatus(value: unknown): value is JobOutboxStatus {
  return (
    value === 'pending' ||
    value === 'claimed' ||
    value === 'published' ||
    value === 'completed' ||
    value === 'dead'
  );
}

function isJobOutboxRow(value: unknown): value is JobOutboxRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.jobType === 'string' &&
    isJobOutboxStatus(candidate.status) &&
    (typeof candidate.attemptCount === 'number' || typeof candidate.attemptCount === 'string') &&
    isDateLike(candidate.nextAttemptAt) &&
    (candidate.publishedAt === null || isDateLike(candidate.publishedAt)) &&
    (candidate.traceId === null || typeof candidate.traceId === 'string') &&
    (candidate.lastError === null || typeof candidate.lastError === 'string') &&
    typeof candidate.groupKey === 'string' &&
    typeof candidate.deduplicationKey === 'string' &&
    isDateLike(candidate.createdAt) &&
    isDateLike(candidate.updatedAt)
  );
}

function isJobOutboxIdRow(value: unknown): value is JobOutboxIdRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.id === 'string';
}

@Injectable()
export class JobOutboxTypeOrmRepository implements JobOutboxRepositoryPort {
  private readonly outboxClaimTimeoutMs = getAppConfig().jobs.outboxClaimTimeoutMs;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<JobOutbox | null> {
    const entity = await getTypeormRepository(this.dataSource, JobOutboxTypeOrmEntity).findOne({
      where: { id },
    });

    return entity ? JobOutboxMapper.toDomain(entity) : null;
  }

  async findByIdForUpdate(id: string): Promise<JobOutbox | null> {
    const manager = getTypeormEntityManager(this.dataSource);

    if (manager === this.dataSource.manager) {
      return this.findById(id);
    }

    const entity = await manager
      .getRepository(JobOutboxTypeOrmEntity)
      .createQueryBuilder('job')
      .where('job.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();

    return entity ? JobOutboxMapper.toDomain(entity) : null;
  }

  async findByStatus(status: JobOutboxStatus): Promise<JobOutbox[]> {
    const entities = await getTypeormRepository(this.dataSource, JobOutboxTypeOrmEntity).find({
      where: { status },
      order: { createdAt: 'ASC' },
    });

    return entities.map(JobOutboxMapper.toDomain);
  }

  async create(jobOutbox: JobOutbox): Promise<JobOutbox> {
    const repository = getTypeormRepository(this.dataSource, JobOutboxTypeOrmEntity);
    const saved = await repository.save(
      repository.create(JobOutboxMapper.toPersistence(jobOutbox)),
    );

    return JobOutboxMapper.toDomain(saved);
  }

  async claimPendingBatch(limit: number, now: Date): Promise<JobOutbox[]> {
    const manager = getTypeormEntityManager(this.dataSource);
    const staleClaimThreshold = new Date(now.getTime() - this.outboxClaimTimeoutMs);
    const queryResult: unknown = await manager.query(
      `
        WITH claimable AS (
          SELECT "id"
          FROM "job_outbox"
          WHERE (
            "status" = 'pending'
            AND "next_attempt_at" <= $1
          ) OR (
            "status" = 'claimed'
            AND "updated_at" < $3
          )
          ORDER BY "created_at" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT $2
        )
        UPDATE "job_outbox" AS "job"
        SET
          "status" = 'claimed',
          "updated_at" = now()
        FROM claimable
        WHERE "job"."id" = claimable."id"
        RETURNING
          "job"."id" AS "id",
          "job"."job_type" AS "jobType",
          "job"."payload" AS "payload",
          "job"."trace_id" AS "traceId",
          "job"."status" AS "status",
          "job"."attempt_count" AS "attemptCount",
          "job"."next_attempt_at" AS "nextAttemptAt",
          "job"."published_at" AS "publishedAt",
          "job"."last_error" AS "lastError",
          "job"."group_key" AS "groupKey",
          "job"."deduplication_key" AS "deduplicationKey",
          "job"."created_at" AS "createdAt",
          "job"."updated_at" AS "updatedAt"
      `,
      [now, limit, staleClaimThreshold],
    );
    const rows = this.normalizeRows(queryResult);

    return rows.map((row) =>
      JobOutboxMapper.toDomain({
        id: row.id,
        jobType: row.jobType,
        payload: row.payload,
        traceId: row.traceId,
        status: row.status,
        attemptCount: Number(row.attemptCount),
        nextAttemptAt: new Date(row.nextAttemptAt),
        publishedAt: row.publishedAt ? new Date(row.publishedAt) : null,
        lastError: row.lastError,
        groupKey: row.groupKey,
        deduplicationKey: row.deduplicationKey,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }),
    );
  }

  async replayDeadBatch(limit: number, now: Date): Promise<readonly string[]> {
    const manager = getTypeormEntityManager(this.dataSource);
    const queryResult: unknown = await manager.query(
      `
        WITH replayable AS (
          SELECT "id"
          FROM "job_outbox"
          WHERE "status" = 'dead'
          ORDER BY "updated_at" ASC
          LIMIT $1
        )
        UPDATE "job_outbox" AS "job"
        SET
          "status" = 'pending',
          "attempt_count" = 0,
          "next_attempt_at" = $2,
          "published_at" = NULL,
          "last_error" = NULL,
          "updated_at" = now()
        FROM replayable
        WHERE "job"."id" = replayable."id"
        RETURNING "job"."id" AS "id"
      `,
      [limit, now],
    );

    return this.normalizeIdRows(queryResult).map((row) => row.id);
  }

  async replayDeadByIds(ids: readonly string[], now: Date): Promise<readonly string[]> {
    if (ids.length === 0) {
      return [];
    }

    const manager = getTypeormEntityManager(this.dataSource);
    const queryResult: unknown = await manager.query(
      `
        UPDATE "job_outbox"
        SET
          "status" = 'pending',
          "attempt_count" = 0,
          "next_attempt_at" = $2,
          "published_at" = NULL,
          "last_error" = NULL,
          "updated_at" = now()
        WHERE "status" = 'dead'
          AND "id" = ANY($1::uuid[])
        RETURNING "id" AS "id"
      `,
      [ids, now],
    );

    return this.normalizeIdRows(queryResult).map((row) => row.id);
  }

  async deleteByStatusOlderThan(
    status: JobOutboxStatus,
    olderThan: Date,
    limit: number,
  ): Promise<number> {
    const manager = getTypeormEntityManager(this.dataSource);
    const queryResult: unknown = await manager.query(
      `
        WITH deletable AS (
          SELECT "id"
          FROM "job_outbox"
          WHERE "status" = $1
            AND "updated_at" < $2
          ORDER BY "updated_at" ASC
          LIMIT $3
        )
        DELETE FROM "job_outbox" AS "job"
        USING deletable
        WHERE "job"."id" = deletable."id"
        RETURNING "job"."id" AS "id"
      `,
      [status, olderThan, limit],
    );

    return this.normalizeIdRows(queryResult).length;
  }

  async update(jobOutbox: JobOutbox): Promise<JobOutbox> {
    const repository = getTypeormRepository(this.dataSource, JobOutboxTypeOrmEntity);
    const saved = await repository.save(
      repository.create(JobOutboxMapper.toPersistence(jobOutbox)),
    );

    return JobOutboxMapper.toDomain(saved);
  }

  private normalizeRows(queryResult: unknown): JobOutboxRow[] {
    if (Array.isArray(queryResult)) {
      const rows: unknown[] = queryResult;
      const first = rows[0];

      if (Array.isArray(first)) {
        return first.filter(isJobOutboxRow);
      }

      return rows.filter(isJobOutboxRow);
    }

    return [];
  }

  private normalizeIdRows(queryResult: unknown): JobOutboxIdRow[] {
    if (Array.isArray(queryResult)) {
      const rows: unknown[] = queryResult;
      const first = rows[0];

      if (Array.isArray(first)) {
        return first.filter(isJobOutboxIdRow);
      }

      return rows.filter(isJobOutboxIdRow);
    }

    return [];
  }
}
