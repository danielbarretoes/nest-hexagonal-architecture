import { DataSource } from 'typeorm';
import { JobOutbox } from '../src/modules/jobs/domain/entities/job-outbox.entity';
import { JobOutboxTypeOrmRepository } from '../src/modules/jobs/infrastructure/persistence/typeorm/repositories/job-outbox.typeorm-repository';
import { resetTestDatabase, useTestDatabaseEnvironment } from './support/test-database';

describe('JobOutboxTypeOrmRepository (integration, PostgreSQL)', () => {
  let dataSource: DataSource;
  let repository: JobOutboxTypeOrmRepository;

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  beforeEach(async () => {
    useTestDatabaseEnvironment();
    dataSource = await resetTestDatabase();
    repository = new JobOutboxTypeOrmRepository(dataSource as never);
  });

  afterEach(async () => {
    await dataSource?.destroy();
  });

  it('claims only pending jobs that are ready to be published', async () => {
    await repository.create(
      JobOutbox.create({
        id: '00000000-0000-4000-8000-000000000101',
        type: 'transactional_email',
        payload: { type: 'welcome', to: 'one@example.com', recipientName: 'One' },
        groupKey: 'transactional_email',
        deduplicationKey: 'job-101',
      }),
    );
    await repository.create(
      JobOutbox.create({
        id: '00000000-0000-4000-8000-000000000102',
        type: 'transactional_email',
        payload: { type: 'welcome', to: 'two@example.com', recipientName: 'Two' },
        groupKey: 'transactional_email',
        deduplicationKey: 'job-102',
        nextAttemptAt: new Date(Date.now() + 60_000),
      }),
    );

    const claimed = await repository.claimPendingBatch(10, new Date());

    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.id).toBe('00000000-0000-4000-8000-000000000101');
    expect(claimed[0]?.status).toBe('claimed');
  });

  it('reclaims stale claimed jobs so they do not remain stranded forever', async () => {
    await repository.create(
      JobOutbox.create({
        id: '00000000-0000-4000-8000-000000000111',
        type: 'transactional_email',
        payload: { type: 'welcome', to: 'claimed@example.com', recipientName: 'Claimed' },
        groupKey: 'transactional_email',
        deduplicationKey: 'job-111',
      }).markClaimed(),
    );

    await dataSource.query('UPDATE "job_outbox" SET "updated_at" = $2 WHERE "id" = $1', [
      '00000000-0000-4000-8000-000000000111',
      new Date('2026-04-01T11:58:00.000Z'),
    ]);

    const claimed = await repository.claimPendingBatch(10, new Date('2026-04-01T12:00:00.000Z'));

    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.id).toBe('00000000-0000-4000-8000-000000000111');
    expect(claimed[0]?.status).toBe('claimed');
  });

  it('replays dead jobs back to pending and clears the terminal error state', async () => {
    await repository.create(
      JobOutbox.create({
        id: '00000000-0000-4000-8000-000000000201',
        type: 'transactional_email',
        payload: { type: 'welcome', to: 'dead@example.com', recipientName: 'Dead' },
        groupKey: 'transactional_email',
        deduplicationKey: 'job-201',
      }).markDead('SES rejected message'),
    );

    const replayedIds = await repository.replayDeadBatch(10, new Date('2026-04-01T12:30:00.000Z'));
    const rows: Array<{
      status: string;
      attempt_count: number;
      last_error: string | null;
    }> = await dataSource.query(
      'SELECT "status", "attempt_count", "last_error" FROM "job_outbox" WHERE "id" = $1',
      ['00000000-0000-4000-8000-000000000201'],
    );

    expect(replayedIds).toEqual(['00000000-0000-4000-8000-000000000201']);
    expect(rows).toEqual([
      {
        status: 'pending',
        attempt_count: 0,
        last_error: null,
      },
    ]);
  });

  it('deletes aged terminal rows by status without touching recent rows', async () => {
    await repository.create(
      JobOutbox.create({
        id: '00000000-0000-4000-8000-000000000301',
        type: 'transactional_email',
        payload: { type: 'welcome', to: 'old@example.com', recipientName: 'Old' },
        groupKey: 'transactional_email',
        deduplicationKey: 'job-301',
      }).markCompleted(),
    );
    await repository.create(
      JobOutbox.create({
        id: '00000000-0000-4000-8000-000000000302',
        type: 'transactional_email',
        payload: { type: 'welcome', to: 'recent@example.com', recipientName: 'Recent' },
        groupKey: 'transactional_email',
        deduplicationKey: 'job-302',
      }).markCompleted(),
    );

    await dataSource.query('UPDATE "job_outbox" SET "updated_at" = $2 WHERE "id" = $1', [
      '00000000-0000-4000-8000-000000000301',
      new Date('2026-03-01T00:00:00.000Z'),
    ]);

    const deletedCount = await repository.deleteByStatusOlderThan(
      'completed',
      new Date('2026-03-15T00:00:00.000Z'),
      10,
    );
    const rows: Array<{ id: string }> = await dataSource.query(
      'SELECT "id" FROM "job_outbox" ORDER BY "id" ASC',
    );

    expect(deletedCount).toBe(1);
    expect(rows).toEqual([{ id: '00000000-0000-4000-8000-000000000302' }]);
  });
});
