import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ALL_WEBHOOK_EVENT_TYPES } from '../../../../shared/domain/integration-events/webhook-event-types';

export class CreateWebhookEndpointDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  url!: string;

  @ApiProperty({ isArray: true, enum: ALL_WEBHOOK_EVENT_TYPES })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(ALL_WEBHOOK_EVENT_TYPES, { each: true })
  events!: string[];
}
