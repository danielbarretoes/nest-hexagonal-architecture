import { Module } from '@nestjs/common';
import { HttpLogsModule } from './http-logs/http-logs.module';

@Module({
  imports: [HttpLogsModule],
  exports: [HttpLogsModule],
})
export class ObservabilityModule {}
