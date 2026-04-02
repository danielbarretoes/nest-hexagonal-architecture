import request from 'supertest';
import type { E2eTestContext } from './support/e2e-app';
import {
  createE2eTestApp,
  destroyE2eTestApp,
  resetE2eDatabase,
  waitForHttpLogsToDrain,
} from './support/e2e-app';
import { createOrganization, loginUser, selfRegisterUser } from './support/iam-fixtures';

describe('API Keys API (e2e, PostgreSQL)', () => {
  let context: E2eTestContext;

  beforeAll(async () => {
    context = await createE2eTestApp();
  });

  beforeEach(async () => {
    await resetE2eDatabase(context);
  });

  afterEach(async () => {
    await waitForHttpLogsToDrain();
  });

  afterAll(async () => {
    await destroyE2eTestApp(context);
  });

  it('creates, authenticates, scopes, lists, and revokes API keys', async () => {
    await selfRegisterUser(context.app.getHttpServer(), {
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'User',
    }).expect(201);

    const loginResponse = await loginUser(context.app.getHttpServer(), 'owner@example.com').expect(
      200,
    );
    const accessToken = loginResponse.body.accessToken as string;

    const organizationResponse = await createOrganization(
      context.app.getHttpServer(),
      accessToken,
      'Acme',
    ).expect(201);
    const organizationId = organizationResponse.body.id as string;

    const createApiKeyResponse = await request(context.app.getHttpServer())
      .post('/api/v1/api-keys')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        name: 'Scoped sync key',
        scopes: ['iam.members.read'],
        expiresInDays: 30,
      })
      .expect(201);

    const apiKey = createApiKeyResponse.body.apiKey as string;
    const apiKeyId = createApiKeyResponse.body.id as string;

    expect(apiKey).toContain('.');
    expect(createApiKeyResponse.body.scopes).toEqual(['iam.members.read']);

    await request(context.app.getHttpServer())
      .get('/api/v1/members')
      .set('x-api-key', apiKey)
      .expect(200);

    await request(context.app.getHttpServer())
      .get('/api/v1/users?page=1&limit=10')
      .set('x-api-key', apiKey)
      .expect(403);

    const listApiKeysResponse = await request(context.app.getHttpServer())
      .get('/api/v1/api-keys?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(listApiKeysResponse.body.meta.totalItems).toBe(1);
    expect(listApiKeysResponse.body.items[0].id).toBe(apiKeyId);
    expect(listApiKeysResponse.body.items[0].keyPrefix).toContain('hex_test_');

    await request(context.app.getHttpServer())
      .delete(`/api/v1/api-keys/${apiKeyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(204);

    await request(context.app.getHttpServer())
      .get('/api/v1/members')
      .set('x-api-key', apiKey)
      .expect(401);
  });
});
