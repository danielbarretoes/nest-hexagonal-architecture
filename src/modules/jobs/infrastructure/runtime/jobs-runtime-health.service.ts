import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import {
  OutboxInspectionService,
  type OutboxInspectionSnapshot,
} from '../../application/outbox-inspection.service';

export interface JobsRuntimeSnapshot {
  databaseReady: true;
  outbox: OutboxInspectionSnapshot;
}

@Injectable()
export class JobsRuntimeHealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly outboxInspectionService: OutboxInspectionService,
  ) {}

  async getSnapshot(deadLimit = 5): Promise<JobsRuntimeSnapshot> {
    await this.dataSource.query('SELECT 1');

    return {
      databaseReady: true,
      outbox: await this.outboxInspectionService.inspect(deadLimit),
    };
  }
}
