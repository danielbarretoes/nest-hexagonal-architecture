import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { writeStructuredLog } from './common/observability/logging/structured-log.util';
import { getAppConfig } from './config/env/app-config';
import { OutboxReplayService } from './modules/jobs/application/outbox-replay.service';
import { WorkerModule } from './worker.module';

interface ReplayCommand {
  ids?: string[];
  limit?: number;
  dryRun: boolean;
}

export function parseReplayCommand(argv: readonly string[]): ReplayCommand {
  const command: ReplayCommand = {
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--ids') {
      const ids = argv[index + 1];

      if (!ids) {
        throw new Error('Expected a comma-separated value after --ids');
      }

      command.ids = ids
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === '--limit') {
      const rawLimit = argv[index + 1];
      const limit = Number(rawLimit);

      if (!rawLimit || !Number.isInteger(limit) || limit <= 0) {
        throw new Error('Expected a positive integer after --limit');
      }

      command.limit = limit;
      index += 1;
      continue;
    }

    if (arg === '--dry-run') {
      command.dryRun = true;
    }
  }

  return command;
}

async function bootstrap(): Promise<void> {
  const config = getAppConfig();
  const logger = new ConsoleLogger('JobsReplayBootstrap', {
    json: config.logging.json,
    logLevels: config.logging.enabledLevels,
  });
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(logger);

  try {
    const replayCommand = parseReplayCommand(process.argv.slice(2));
    const outboxReplayService = app.get(OutboxReplayService);

    if (replayCommand.dryRun) {
      const candidateJobIds = await outboxReplayService.previewDeadJobs(replayCommand);

      writeStructuredLog('log', 'JobsReplayBootstrap', 'Dead job replay preview generated', {
        event: 'jobs.outbox.replay.preview',
        requestedIds: replayCommand.ids ?? null,
        requestedLimit: replayCommand.limit ?? null,
        replayCandidateCount: candidateJobIds.length,
        replayCandidateJobIds: candidateJobIds,
      });

      return;
    }

    const replayedJobIds = await outboxReplayService.replayDeadJobs(replayCommand);

    writeStructuredLog('log', 'JobsReplayBootstrap', 'Dead jobs replayed', {
      event: 'jobs.outbox.replay.completed',
      requestedIds: replayCommand.ids ?? null,
      requestedLimit: replayCommand.limit ?? null,
      replayedCount: replayedJobIds.length,
      replayedJobIds,
    });
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  void bootstrap();
}
