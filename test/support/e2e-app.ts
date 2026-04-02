import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource, type FindOptionsWhere } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureHttpApplication } from '../../src/app.setup';
import { HttpLogsMiddleware } from '../../src/modules/observability/http-logs/presentation/middlewares/http-logs.middleware';
import { HttpLogTypeOrmEntity } from '../../src/modules/observability/http-logs/infrastructure/persistence/typeorm/entities/http-log.entity';
import { resetTestDatabase, truncateIamTables, useTestDatabaseEnvironment } from './test-database';

export interface E2eTestContext {
  app: INestApplication;
  dataSource: DataSource;
}

export async function createE2eTestApp(): Promise<E2eTestContext> {
  useTestDatabaseEnvironment();
  const bootstrapDataSource = await resetTestDatabase();
  await bootstrapDataSource.destroy();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configureHttpApplication(app);
  await app.init();

  return {
    app,
    dataSource: app.get(DataSource),
  };
}

export async function resetE2eDatabase(context: E2eTestContext): Promise<void> {
  await truncateIamTables(context.dataSource);
}

export async function destroyE2eTestApp(context?: E2eTestContext): Promise<void> {
  await HttpLogsMiddleware.waitForIdle();
  await context?.app?.close();
}

export async function waitForHttpLogsToDrain(): Promise<void> {
  await HttpLogsMiddleware.waitForIdle();
}

export async function waitForHttpLog(
  dataSource: DataSource,
  where: FindOptionsWhere<HttpLogTypeOrmEntity>,
): Promise<HttpLogTypeOrmEntity> {
  const repository = dataSource.getRepository(HttpLogTypeOrmEntity);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const entity = await repository.findOne({
      where,
      order: {
        createdAt: 'DESC',
      },
    });

    if (entity) {
      return entity;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error(`Timed out waiting for HTTP log ${JSON.stringify(where)}`);
}

export async function getRoleId(dataSource: DataSource, code: string): Promise<string> {
  const rows: Array<{
    id: string;
  }> = await dataSource.query(`SELECT "id" FROM "roles" WHERE "code" = $1`, [code]);
  const roleId = rows[0]?.id;

  if (!roleId) {
    throw new Error(`Role not found for code ${code}`);
  }

  return roleId;
}
