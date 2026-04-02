import { Module } from '@nestjs/common';
import { EmailAccessModule } from '../notifications/email/email-access.module';
import { WebhooksAccessModule } from '../webhooks/webhooks-access.module';
import { AsyncJobProcessorService } from './application/async-job-processor.service';
import { OutboxCleanupService } from './application/outbox-cleanup.service';
import { OutboxInspectionService } from './application/outbox-inspection.service';
import { JobOutboxRetryPolicyService } from './application/job-outbox-retry-policy.service';
import { OutboxRelayService } from './application/outbox-relay.service';
import { OutboxReplayService } from './application/outbox-replay.service';
import { ASYNC_JOB_PROCESSOR_PORT } from './application/ports/async-job-processor.token';
import { JOB_HANDLERS } from './application/ports/job-handler.token';
import { JOBS_RUNTIME_OPTIONS } from './application/ports/jobs-runtime-options.token';
import { TransactionalEmailJobHandler } from './application/transactional-email-job.handler';
import { WebhookDeliveryJobHandler } from './application/webhook-delivery-job.handler';
import { JobsAccessModule } from './jobs-access.module';
import { OutboxCleanupWorker } from './infrastructure/outbox/outbox-cleanup.worker';
import { OutboxRelayWorker } from './infrastructure/outbox/outbox-relay.worker';
import { JobsRuntimeHealthService } from './infrastructure/runtime/jobs-runtime-health.service';
import { SqsAsyncJobWorker } from './infrastructure/sqs/sqs-async-job.worker';
import { getAppConfig } from '../../config/env/app-config';

@Module({
  imports: [JobsAccessModule, EmailAccessModule, WebhooksAccessModule],
  providers: [
    { provide: ASYNC_JOB_PROCESSOR_PORT, useExisting: AsyncJobProcessorService },
    {
      provide: JOBS_RUNTIME_OPTIONS,
      useValue: {
        outboxMaxAttempts: getAppConfig().jobs.outboxMaxAttempts,
        outboxRetryBaseMs: getAppConfig().jobs.outboxRetryBaseMs,
        outboxRetryMaxMs: getAppConfig().jobs.outboxRetryMaxMs,
        outboxCleanupBatchSize: getAppConfig().jobs.outboxCleanupBatchSize,
        outboxRetentionPublishedHours: getAppConfig().jobs.outboxRetentionPublishedHours,
        outboxRetentionCompletedHours: getAppConfig().jobs.outboxRetentionCompletedHours,
        outboxRetentionDeadHours: getAppConfig().jobs.outboxRetentionDeadHours,
      },
    },
    {
      provide: JOB_HANDLERS,
      useFactory: (
        transactionalEmailJobHandler: TransactionalEmailJobHandler,
        webhookDeliveryJobHandler: WebhookDeliveryJobHandler,
      ) => [transactionalEmailJobHandler, webhookDeliveryJobHandler],
      inject: [TransactionalEmailJobHandler, WebhookDeliveryJobHandler],
    },
    AsyncJobProcessorService,
    OutboxCleanupService,
    OutboxInspectionService,
    JobOutboxRetryPolicyService,
    OutboxRelayService,
    OutboxReplayService,
    TransactionalEmailJobHandler,
    WebhookDeliveryJobHandler,
    OutboxCleanupWorker,
    OutboxRelayWorker,
    JobsRuntimeHealthService,
    SqsAsyncJobWorker,
  ],
  exports: [
    JobsRuntimeHealthService,
    OutboxCleanupWorker,
    OutboxCleanupService,
    OutboxInspectionService,
    OutboxReplayService,
    OutboxRelayWorker,
    SqsAsyncJobWorker,
  ],
})
export class JobsModule {}
