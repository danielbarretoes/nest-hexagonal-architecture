import { Module } from '@nestjs/common';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { getAppConfig } from '../../../config/env/app-config';
import { TRANSACTIONAL_EMAIL_PORT } from '../../../shared/application/ports/transactional-email.token';
import { JobsAccessModule } from '../../jobs/jobs-access.module';
import { DIRECT_TRANSACTIONAL_EMAIL_PORT, TRANSACTIONAL_EMAIL_DELIVERY_MODE } from './email.tokens';
import { NoopTransactionalEmailAdapter } from './infrastructure/adapters/noop-transactional-email.adapter';
import { OutboxTransactionalEmailAdapter } from './infrastructure/adapters/outbox-transactional-email.adapter';
import { SesTransactionalEmailAdapter } from './infrastructure/adapters/ses-transactional-email.adapter';
import { SES_CLIENT } from './infrastructure/aws/ses-client.token';
import { TransactionalEmailTemplateFactory } from './infrastructure/templates/transactional-email-template.factory';

@Module({
  imports: [JobsAccessModule],
  providers: [
    TransactionalEmailTemplateFactory,
    {
      provide: SES_CLIENT,
      useFactory: () => new SESv2Client({ region: getAppConfig().email.sesRegion }),
    },
    NoopTransactionalEmailAdapter,
    SesTransactionalEmailAdapter,
    OutboxTransactionalEmailAdapter,
    {
      provide: DIRECT_TRANSACTIONAL_EMAIL_PORT,
      useFactory: (
        noopAdapter: NoopTransactionalEmailAdapter,
        sesAdapter: SesTransactionalEmailAdapter,
      ) => (getAppConfig().email.enabled ? sesAdapter : noopAdapter),
      inject: [NoopTransactionalEmailAdapter, SesTransactionalEmailAdapter],
    },
    {
      provide: TRANSACTIONAL_EMAIL_PORT,
      useFactory: (
        directAdapter: NoopTransactionalEmailAdapter | SesTransactionalEmailAdapter,
        outboxAdapter: OutboxTransactionalEmailAdapter,
      ) => (getAppConfig().jobs.emailDeliveryMode === 'async' ? outboxAdapter : directAdapter),
      inject: [DIRECT_TRANSACTIONAL_EMAIL_PORT, OutboxTransactionalEmailAdapter],
    },
    {
      provide: TRANSACTIONAL_EMAIL_DELIVERY_MODE,
      useValue: getAppConfig().jobs.emailDeliveryMode,
    },
  ],
  exports: [
    TRANSACTIONAL_EMAIL_PORT,
    DIRECT_TRANSACTIONAL_EMAIL_PORT,
    TRANSACTIONAL_EMAIL_DELIVERY_MODE,
  ],
})
export class EmailModule {}
