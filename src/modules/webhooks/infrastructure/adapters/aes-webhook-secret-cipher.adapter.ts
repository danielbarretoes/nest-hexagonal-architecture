import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getAppConfig } from '../../../../config/env/app-config';
import type { WebhookSecretCipherPort } from '../../domain/ports/webhook-secret-cipher.port';

@Injectable()
export class AesWebhookSecretCipherAdapter implements WebhookSecretCipherPort {
  private readonly key = createHash('sha256')
    .update(getAppConfig().webhooks.secretEncryptionKey)
    .digest();

  encrypt(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  decrypt(ciphertext: string): string {
    const [ivEncoded, authTagEncoded, encryptedEncoded] = ciphertext.split('.');

    if (!ivEncoded || !authTagEncoded || !encryptedEncoded) {
      throw new Error('Invalid webhook secret ciphertext');
    }

    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivEncoded, 'base64url'));
    decipher.setAuthTag(Buffer.from(authTagEncoded, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
