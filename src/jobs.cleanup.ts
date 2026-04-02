import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { writeStructuredLog } from './common/observability/logging/structured-log.util';
import { getAppConfig } from './config/env/app-config';
import { OutboxCleanupService } from './modules/jobs/application/outbox-cleanup.service';
import { WorkerModule } from './worker.module';

export interface CleanupCommand {
  dryRun: boolean;
}

export function parseCleanupCommand(argv: readonly string[]): CleanupCommand {
  return {
    dryRun: argv.includes('--dry-run'),
  };
}

async function bootstrap(): Promise<void> {
  const config = getAppConfig();
  const logger = new ConsoleLogger('JobsCleanupBootstrap', {
    json: config.logging.json,
    logLevels: config.logging.enabledLevels,
  });
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(logger);

  try {
    const cleanupCommand = parseCleanupCommand(process.argv.slice(2));
    const outboxCleanupService = app.get(OutboxCleanupService);

    if (cleanupCommand.dryRun) {
      const preview = await outboxCleanupService.previewCleanup();

      writeStructuredLog('log', 'JobsCleanupBootstrap', 'Outbox cleanup preview generated', {
        event: 'jobs.outbox.cleanup.preview',
        preview,
      });

      return;
    }

    const result = await outboxCleanupService.cleanupOnce();

    writeStructuredLog('log', 'JobsCleanupBootstrap', 'Outbox cleanup completed', {
      event: 'jobs.outbox.cleanup.completed',
      result,
    });
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  void bootstrap();
}
