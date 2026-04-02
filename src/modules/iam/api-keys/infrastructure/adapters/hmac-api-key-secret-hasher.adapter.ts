import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getAppConfig } from '../../../../../config/env/app-config';
import type { ApiKeySecretHasherPort } from '../../domain/ports/api-key-secret-hasher.port';

@Injectable()
export class HmacApiKeySecretHasherAdapter implements ApiKeySecretHasherPort {
  private readonly secret = getAppConfig().apiKeys.secret;

  hash(secret: string): string {
    return createHmac('sha256', this.secret).update(secret).digest('hex');
  }

  verify(secret: string, secretHash: string): boolean {
    const expectedHash = Buffer.from(this.hash(secret), 'utf8');
    const receivedHash = Buffer.from(secretHash, 'utf8');

    if (expectedHash.length !== receivedHash.length) {
      return false;
    }

    return timingSafeEqual(expectedHash, receivedHash);
  }
}
