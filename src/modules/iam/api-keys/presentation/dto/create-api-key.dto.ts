import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ALL_PERMISSION_CODES,
  type PermissionCode,
} from '../../../../../shared/domain/authorization/permission-codes';

export class CreateApiKeyDto {
  @ApiProperty({
    example: 'Stripe sync key',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    isArray: true,
    enum: ALL_PERMISSION_CODES,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsIn(ALL_PERMISSION_CODES, { each: true })
  scopes?: PermissionCode[];

  @ApiPropertyOptional({
    example: 90,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}
