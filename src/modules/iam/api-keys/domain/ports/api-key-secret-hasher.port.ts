export interface ApiKeySecretHasherPort {
  hash(secret: string): string;
  verify(secret: string, secretHash: string): boolean;
}
