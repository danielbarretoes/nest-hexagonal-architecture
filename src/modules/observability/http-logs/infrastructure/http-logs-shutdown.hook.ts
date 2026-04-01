import { BeforeApplicationShutdown, Injectable } from '@nestjs/common';
import { HttpLogWriteDrain } from '../application/http-log-write-drain';

@Injectable()
export class HttpLogsShutdownHook implements BeforeApplicationShutdown {
  async beforeApplicationShutdown(): Promise<void> {
    await HttpLogWriteDrain.waitForIdle();
  }
}
