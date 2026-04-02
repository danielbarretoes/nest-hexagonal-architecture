import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { writeStructuredLog } from './common/observability/logging/structured-log.util';
import { getAppConfig } from './config/env/app-config';
import { OutboxInspectionService } from './modules/jobs/application/outbox-inspection.service';
import { WorkerModule } from './worker.module';

export interface InspectCommand {
  deadLimit: number;
}

export function parseInspectCommand(argv: readonly string[]): InspectCommand {
  const command: InspectCommand = {
    deadLimit: 10,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dead-limit') {
      const rawLimit = argv[index + 1];
      const deadLimit = Number(rawLimit);

      if (!rawLimit || !Number.isInteger(deadLimit) || deadLimit <= 0) {
        throw new Error('Expected a positive integer after --dead-limit');
      }

      command.deadLimit = deadLimit;
      index += 1;
    }
  }

  return command;
}

async function bootstrap(): Promise<void> {
  const config = getAppConfig();
  const logger = new ConsoleLogger('JobsInspectBootstrap', {
    json: config.logging.json,
    logLevels: config.logging.enabledLevels,
  });
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(logger);

  try {
    const inspectCommand = parseInspectCommand(process.argv.slice(2));
    const outboxInspectionService = app.get(OutboxInspectionService);
    const snapshot = await outboxInspectionService.inspect(inspectCommand.deadLimit);

    writeStructuredLog('log', 'JobsInspectBootstrap', 'Outbox inspected', {
      event: 'jobs.outbox.inspect.completed',
      deadLimit: inspectCommand.deadLimit,
      outboxCounts: snapshot.counts,
      deadJobs: snapshot.deadJobs,
    });
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  void bootstrap();
}
