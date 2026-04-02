import request from 'supertest';
import type { E2eTestContext } from './support/e2e-app';
import {
  createE2eTestApp,
  destroyE2eTestApp,
  resetE2eDatabase,
  waitForHttpLogsToDrain,
} from './support/e2e-app';
import { selfRegisterUser } from './support/iam-fixtures';

describe('Async Email Outbox API (e2e, PostgreSQL)', () => {
  let context: E2eTestContext;
  const originalJobsEnabled = process.env.JOBS_ENABLED;
  const originalEmailDeliveryMode = process.env.JOBS_EMAIL_DELIVERY_MODE;
  const originalJobsQueueUrl = process.env.JOBS_SQS_QUEUE_URL;

  beforeAll(async () => {
    process.env.JOBS_ENABLED = 'true';
    process.env.JOBS_EMAIL_DELIVERY_MODE = 'async';
    process.env.JOBS_SQS_QUEUE_URL =
      process.env.JOBS_SQS_QUEUE_URL ||
      'https://sqs.us-east-1.amazonaws.com/000000000000/hexagonal-test-queue';
    context = await createE2eTestApp();
  });

  beforeEach(async () => {
    await resetE2eDatabase(context);
  });

  afterEach(async () => {
    await waitForHttpLogsToDrain();
  });

  afterAll(async () => {
    process.env.JOBS_ENABLED = originalJobsEnabled;
    process.env.JOBS_EMAIL_DELIVERY_MODE = originalEmailDeliveryMode;
    process.env.JOBS_SQS_QUEUE_URL = originalJobsQueueUrl;
    await destroyE2eTestApp(context);
  });

  it('persists password reset emails in the durable outbox when async delivery is enabled', async () => {
    await selfRegisterUser(context.app.getHttpServer(), {
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    }).expect(201);

    await context.dataSource.query(
      'TRUNCATE TABLE "job_execution_receipts", "job_outbox" RESTART IDENTITY CASCADE',
    );

    const requestResetResponse = await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({
        email: 'john@example.com',
      })
      .expect(200);

    expect(requestResetResponse.body.resetToken).toEqual(expect.any(String));

    const rows: Array<{
      job_type: string;
      status: string;
      payload: {
        type: string;
        to: string;
      };
    }> = await context.dataSource.query(
      'SELECT "job_type", "status", "payload" FROM "job_outbox" ORDER BY "created_at" ASC',
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.job_type).toBe('transactional_email');
    expect(rows[0]?.status).toBe('pending');
    expect(rows[0]?.payload.type).toBe('password_reset');
    expect(rows[0]?.payload.to).toBe('john@example.com');
  });
});
