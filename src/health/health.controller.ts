import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @Version(VERSION_NEUTRAL)
  live() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @Version(VERSION_NEUTRAL)
  async ready() {
    return this.healthService.getReadiness();
  }
}
