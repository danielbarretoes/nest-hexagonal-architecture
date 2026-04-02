import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { getAppConfig } from '../../../../config/env/app-config';
import { writeStructuredLog } from '../../../../common/observability/logging/structured-log.util';
import { OutboxRelayService } from '../../application/outbox-relay.service';

@Injectable()
export class OutboxRelayWorker implements OnModuleDestroy {
  private readonly jobsConfig = getAppConfig().jobs;
  private running = true;

  constructor(private readonly outboxRelayService: OutboxRelayService) {}

  async start(): Promise<void> {
    if (!this.jobsConfig.enabled) {
      writeStructuredLog('log', OutboxRelayWorker.name, 'Outbox relay disabled', {
        event: 'jobs.outbox.disabled',
      });
      return;
    }

    writeStructuredLog('log', OutboxRelayWorker.name, 'Outbox relay started', {
      event: 'jobs.outbox.started',
      batchSize: this.jobsConfig.outboxBatchSize,
      pollIntervalMs: this.jobsConfig.outboxPollIntervalMs,
    });

    while (this.running) {
      const claimedJobIds = await this.outboxRelayService.claimPendingBatch(
        this.jobsConfig.outboxBatchSize,
      );

      if (claimedJobIds.length === 0) {
        await this.sleep(this.jobsConfig.outboxPollIntervalMs);
        continue;
      }

      for (const jobId of claimedJobIds) {
        if (!this.running) {
          break;
        }

        await this.outboxRelayService.dispatchClaimedJob(jobId);
      }
    }

    writeStructuredLog('log', OutboxRelayWorker.name, 'Outbox relay stopped', {
      event: 'jobs.outbox.stopped',
    });
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  private async sleep(durationMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }
}
