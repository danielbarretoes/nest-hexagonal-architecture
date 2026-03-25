import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureHttpApplication } from '../src/app.setup';
import { UserTypeOrmEntity } from '../src/modules/iam/users/infrastructure/persistence/typeorm/entities/user.entity';
import { HttpLogTypeOrmEntity } from '../src/modules/observability/http-logs/infrastructure/persistence/typeorm/entities/http-log.entity';
import { HttpLogsMiddleware } from '../src/modules/observability/http-logs/presentation/middlewares/http-logs.middleware';
import {
  resetTestDatabase,
  truncateIamTables,
  useTestDatabaseEnvironment,
} from './support/test-database';

describe('IAM API (e2e, PostgreSQL)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  async function waitForHttpLog(
    where: Partial<HttpLogTypeOrmEntity>,
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

  beforeAll(async () => {
    useTestDatabaseEnvironment();
    const bootstrapDataSource = await resetTestDatabase();
    await bootstrapDataSource.destroy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app);
    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await truncateIamTables(dataSource);
  });

  afterEach(async () => {
    await HttpLogsMiddleware.waitForIdle();
  });

  afterAll(async () => {
    await HttpLogsMiddleware.waitForIdle();
    await app?.close();
  });

  it('registers, authenticates, reads, paginates and soft deletes a user through real HTTP endpoints', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'john@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      })
      .expect(201);

    expect(registerResponse.body.email).toBe('john@example.com');
    expect(registerResponse.body.fullName).toBe('John Doe');
    expect(registerResponse.body).not.toHaveProperty('isActive');

    const registrationLog = await waitForHttpLog({
      method: 'POST',
      path: '/api/v1/users',
      statusCode: 201,
    });

    expect(registrationLog.requestBody).toMatchObject({
      email: 'john@example.com',
      password: '[REDACTED]',
    });
    expect(registrationLog.responseBody).toMatchObject({
      email: 'john@example.com',
    });
    expect(registrationLog.durationMs).toBeGreaterThanOrEqual(0);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'john@example.com',
        password: 'Password123',
      })
      .expect(200);

    expect(loginResponse.body.accessToken).toEqual(expect.any(String));

    const accessToken = loginResponse.body.accessToken as string;
    const userId = registerResponse.body.id as string;

    const loginLog = await waitForHttpLog({
      method: 'POST',
      path: '/api/v1/auth/login',
      statusCode: 200,
    });

    expect(loginLog.responseBody).toMatchObject({
      accessToken: '[REDACTED]',
    });

    const getUserResponse = await request(app.getHttpServer())
      .get(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getUserResponse.body.id).toBe(userId);
    expect(getUserResponse.body.email).toBe('john@example.com');

    const paginatedUsersResponse = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(paginatedUsersResponse.body.meta.totalItems).toBe(1);
    expect(paginatedUsersResponse.body.items[0].email).toBe('john@example.com');

    const organizationsResponse = await request(app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(organizationsResponse.body.meta.totalItems).toBe(0);

    await request(app.getHttpServer())
      .delete(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const persistedUser = await dataSource.getRepository(UserTypeOrmEntity).findOne({
      where: { id: userId },
      withDeleted: true,
    });

    expect(persistedUser?.deletedAt).toBeInstanceOf(Date);

    await request(app.getHttpServer())
      .get(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'john@example.com',
        password: 'Password123',
      })
      .expect(401);

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}/restore`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(restoreResponse.body.id).toBe(userId);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'john@example.com',
        password: 'Password123',
      })
      .expect(200);

    const createOrganizationResponse = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Acme',
      })
      .expect(201);

    const organizationId = createOrganizationResponse.body.id as string;

    await dataSource.query(
      `
        INSERT INTO "members" ("id", "user_id", "organization_id", "role")
        VALUES ($1, $2, $3, 'owner')
      `,
      ['f81d6b17-138e-45e9-aec1-c0904d06f0d7', userId, organizationId],
    );

    const paginatedOrganizationsBeforeDelete = await request(app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(paginatedOrganizationsBeforeDelete.body.meta.totalItems).toBe(1);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const paginatedOrganizationsAfterDelete = await request(app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(paginatedOrganizationsAfterDelete.body.meta.totalItems).toBe(0);

    const restoredOrganizationResponse = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/restore`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(restoredOrganizationResponse.body.id).toBe(organizationId);

    const getOrganizationResponse = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getOrganizationResponse.body.name).toBe('Acme');

    const paginatedOrganizationsAfterRestore = await request(app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(paginatedOrganizationsAfterRestore.body.meta.totalItems).toBe(1);

    await request(app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const scopedOrganizationsLog = await waitForHttpLog({
      method: 'GET',
      path: '/api/v1/organizations',
      statusCode: 200,
      organizationId,
    });

    const httpLogByIdResponse = await request(app.getHttpServer())
      .get(`/api/v1/http-logs/${scopedOrganizationsLog.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(httpLogByIdResponse.body.id).toBe(scopedOrganizationsLog.id);
    expect(httpLogByIdResponse.body.traceId).toBe(scopedOrganizationsLog.traceId);

    const httpLogsByTraceIdResponse = await request(app.getHttpServer())
      .get(`/api/v1/http-logs/trace/${scopedOrganizationsLog.traceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(httpLogsByTraceIdResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: scopedOrganizationsLog.id,
          traceId: scopedOrganizationsLog.traceId,
        }),
      ]),
    );

    const createdFrom = new Date(scopedOrganizationsLog.createdAt.getTime() - 5_000).toISOString();
    const createdTo = new Date().toISOString();

    const httpLogs2xxResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/http-logs?page=1&limit=50&createdFrom=${createdFrom}&createdTo=${createdTo}&statusFamily=2xx`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(httpLogs2xxResponse.body.meta.totalItems).toBeGreaterThan(0);
    expect(httpLogs2xxResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: scopedOrganizationsLog.id,
          statusCode: 200,
        }),
      ]),
    );
    expect(
      (
        httpLogs2xxResponse.body.items as Array<{
          statusCode: number;
        }>
      ).every((item) => item.statusCode >= 200 && item.statusCode < 300),
    ).toBe(true);

    const missingUserId = '00000000-0000-4000-8000-000000000999';

    await request(app.getHttpServer())
      .get(`/api/v1/users/${missingUserId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(404);

    await waitForHttpLog({
      method: 'GET',
      path: `/api/v1/users/${missingUserId}`,
      statusCode: 404,
      organizationId,
    });

    const httpLogs4xxResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/http-logs?page=1&limit=50&createdFrom=${createdFrom}&createdTo=${new Date().toISOString()}&statusFamily=4xx`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(httpLogs4xxResponse.body.meta.totalItems).toBeGreaterThan(0);
    expect(
      (
        httpLogs4xxResponse.body.items as Array<{
          path: string;
          statusCode: number;
        }>
      ).some((item) => item.path === `/api/v1/users/${missingUserId}` && item.statusCode === 404),
    ).toBe(true);
    expect(
      (
        httpLogs4xxResponse.body.items as Array<{
          statusCode: number;
        }>
      ).every((item) => item.statusCode >= 400 && item.statusCode < 500),
    ).toBe(true);
  });

  it('returns RFC 7807 problem details for invalid payloads and unauthorized access', async () => {
    const invalidRegistrationResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: '',
      })
      .expect(400);

    expect(invalidRegistrationResponse.body.type).toContain('validation-failed');
    expect(invalidRegistrationResponse.body.traceId).toEqual(expect.any(String));
    expect(invalidRegistrationResponse.body['invalid-params']).toEqual(expect.any(Array));

    const invalidRegistrationLog = await waitForHttpLog({
      method: 'POST',
      path: '/api/v1/users',
      statusCode: 400,
    });

    expect(invalidRegistrationLog.requestBody).toMatchObject({
      email: 'invalid-email',
      password: '[REDACTED]',
    });
    expect(invalidRegistrationLog.errorMessage).toBe('Bad Request Exception');
    expect(invalidRegistrationLog.responseBody).toMatchObject({
      status: 400,
    });

    const unauthorizedResponse = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&limit=10')
      .expect(401);

    expect(unauthorizedResponse.body.type).toContain('unauthorized');
    expect(unauthorizedResponse.body.traceId).toEqual(expect.any(String));

    const unauthorizedLog = await waitForHttpLog({
      method: 'GET',
      path: '/api/v1/users',
      statusCode: 401,
    });

    expect(unauthorizedLog.errorMessage).toBe('Missing authentication token');
    expect(unauthorizedLog.queryParams).toMatchObject({
      page: '1',
      limit: '10',
    });
  });

  it('rejects invalid tenant context and insufficient http_logs privileges through real HTTP endpoints', async () => {
    const ownerRegistrationResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'owner@example.com',
        password: 'Password123',
        firstName: 'Owner',
        lastName: 'User',
      })
      .expect(201);

    const guestRegistrationResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'guest@example.com',
        password: 'Password123',
        firstName: 'Guest',
        lastName: 'User',
      })
      .expect(201);

    const ownerLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@example.com',
        password: 'Password123',
      })
      .expect(200);

    const guestLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'guest@example.com',
        password: 'Password123',
      })
      .expect(200);

    const ownerAccessToken = ownerLoginResponse.body.accessToken as string;
    const guestAccessToken = guestLoginResponse.body.accessToken as string;
    const ownerUserId = ownerRegistrationResponse.body.id as string;
    const guestUserId = guestRegistrationResponse.body.id as string;

    const createOrganizationResponse = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .send({
        name: 'Secure Tenant',
      })
      .expect(201);

    const organizationId = createOrganizationResponse.body.id as string;

    await dataSource.query(
      `
        INSERT INTO "members" ("id", "user_id", "organization_id", "role")
        VALUES ($1, $2, $3, 'owner'), ($4, $5, $6, 'guest')
      `,
      [
        'd0cbd47b-478b-409b-94a7-51073cf1ccf1',
        ownerUserId,
        organizationId,
        '7f225f0f-57a3-481a-8a21-8f86bdb15106',
        guestUserId,
        organizationId,
      ],
    );

    await request(app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const missingTenantHeaderResponse = await request(app.getHttpServer())
      .get('/api/v1/http-logs?page=1&limit=10')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .expect(403);

    expect(missingTenantHeaderResponse.body.detail).toBe(
      'x-organization-id header is required for http_logs access',
    );

    const guestForbiddenResponse = await request(app.getHttpServer())
      .get('/api/v1/http-logs?page=1&limit=10')
      .set('Authorization', `Bearer ${guestAccessToken}`)
      .set('x-organization-id', organizationId)
      .expect(403);

    expect(guestForbiddenResponse.body.detail).toBe(
      'Insufficient tenant privileges for http_logs access',
    );

    const invalidTenantId = '00000000-0000-4000-8000-000000000777';

    const invalidTenantResponse = await request(app.getHttpServer())
      .get('/api/v1/organizations?page=1&limit=10')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .set('x-organization-id', invalidTenantId)
      .expect(403);

    expect(invalidTenantResponse.body.detail).toBe('Invalid tenant context for authenticated user');
  });
});
