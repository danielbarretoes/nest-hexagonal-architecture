import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { writeStructuredLog } from './common/observability/logging/structured-log.util';
import { getAppConfig } from './config/env/app-config';
import { OutboxCleanupWorker } from './modules/jobs/infrastructure/outbox/outbox-cleanup.worker';
import { OutboxRelayWorker } from './modules/jobs/infrastructure/outbox/outbox-relay.worker';
import { JobsRuntimeHealthService } from './modules/jobs/infrastructure/runtime/jobs-runtime-health.service';
import { SqsAsyncJobWorker } from './modules/jobs/infrastructure/sqs/sqs-async-job.worker';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const config = getAppConfig();
  const logger = new ConsoleLogger('WorkerBootstrap', {
    json: config.logging.json,
    logLevels: config.logging.enabledLevels,
  });

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(logger);
  app.enableShutdownHooks();

  writeStructuredLog('log', 'WorkerBootstrap', 'Worker application started', {
    event: 'jobs.worker.application.started',
    queueUrl: config.jobs.sqsQueueUrl || null,
  });

  const jobsRuntimeHealthService = app.get(JobsRuntimeHealthService);
  const outboxCleanupWorker = app.get(OutboxCleanupWorker);
  const outboxRelayWorker = app.get(OutboxRelayWorker);
  const sqsAsyncJobWorker = app.get(SqsAsyncJobWorker);

  try {
    const snapshot = await jobsRuntimeHealthService.getSnapshot();

    writeStructuredLog('log', 'WorkerBootstrap', 'Worker readiness check passed', {
      event: 'jobs.worker.readiness.ok',
      databaseReady: snapshot.databaseReady,
      outboxCounts: snapshot.outbox.counts,
    });

    await Promise.all([
      outboxCleanupWorker.start(),
      outboxRelayWorker.start(),
      sqsAsyncJobWorker.start(),
    ]);
  } finally {
    await app.close();
  }
}

void bootstrap();
