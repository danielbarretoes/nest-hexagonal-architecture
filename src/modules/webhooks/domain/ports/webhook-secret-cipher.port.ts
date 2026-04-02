export interface WebhookSecretCipherPort {
  encrypt(secret: string): string;
  decrypt(ciphertext: string): string;
}
