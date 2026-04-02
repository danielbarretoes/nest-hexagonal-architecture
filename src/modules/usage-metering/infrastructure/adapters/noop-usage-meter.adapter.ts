import { Injectable } from '@nestjs/common';
import type { UsageMeterPort } from '../../../../shared/domain/ports/usage-meter.port';

@Injectable()
export class NoopUsageMeterAdapter implements UsageMeterPort {
  async record(): Promise<void> {}
}
