import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class GetApiKeyUsageSummaryQueryDto {
  @ApiProperty({ required: false, default: 24, minimum: 1, maximum: 720 })
  @Transform(({ value }) => Number(value ?? 24))
  @IsInt()
  @Min(1)
  @Max(720)
  windowHours = 24;

  @ApiProperty({ required: false, default: 100, minimum: 1, maximum: 250 })
  @Transform(({ value }) => Number(value ?? 100))
  @IsInt()
  @Min(1)
  @Max(250)
  limit = 100;
}

export class ApiKeyUsageSummaryItemDto {
  @ApiProperty({ format: 'uuid' })
  apiKeyId!: string;

  @ApiProperty({ nullable: true })
  apiKeyName!: string | null;

  @ApiProperty()
  routeKey!: string;

  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  totalCount!: number;

  @ApiProperty()
  lastSeenAt!: Date;
}

export class ApiKeyUsageSummaryResponseDto {
  @ApiProperty()
  windowHours!: number;

  @ApiProperty({ type: [ApiKeyUsageSummaryItemDto] })
  items!: ApiKeyUsageSummaryItemDto[];
}
