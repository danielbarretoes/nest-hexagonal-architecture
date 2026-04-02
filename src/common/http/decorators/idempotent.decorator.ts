import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_REQUEST_METADATA_KEY = 'http:idempotent-request';

export const Idempotent = () => SetMetadata(IDEMPOTENT_REQUEST_METADATA_KEY, true);
