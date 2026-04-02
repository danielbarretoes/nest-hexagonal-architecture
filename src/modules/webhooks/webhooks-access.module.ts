import { Module } from '@nestjs/common';
import { WebhooksModule } from './webhooks.module';

@Module({
  imports: [WebhooksModule],
  exports: [WebhooksModule],
})
export class WebhooksAccessModule {}
