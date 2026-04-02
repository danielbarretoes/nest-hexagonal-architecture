import { ApiProperty } from '@nestjs/swagger';

export class ApiKeyResponseDto {
  @ApiProperty({ example: 'f73c93dc-5d73-4935-a1a1-29240480856c' })
  id!: string;

  @ApiProperty({ example: 'Stripe sync key' })
  name!: string;

  @ApiProperty({ example: 'hex_test_f73c93dc' })
  keyPrefix!: string;

  @ApiProperty({ example: ['iam.users.read', 'iam.members.read'] })
  scopes!: readonly string[];

  @ApiProperty({ nullable: true, example: '2026-07-01T00:00:00.000Z' })
  expiresAt!: Date | null;

  @ApiProperty({ nullable: true, example: '2026-04-01T13:00:00.000Z' })
  lastUsedAt!: Date | null;

  @ApiProperty({ nullable: true, example: '127.0.0.1' })
  lastUsedIp!: string | null;

  @ApiProperty({ nullable: true, example: null })
  revokedAt!: Date | null;

  @ApiProperty({ example: '2026-04-01T12:00:00.000Z' })
  createdAt!: Date;
}
