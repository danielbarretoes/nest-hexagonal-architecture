import { ApiProperty } from '@nestjs/swagger';

export class WebhookEndpointResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({ isArray: true, type: String })
  events!: string[];

  @ApiProperty({ nullable: true })
  lastDeliveryAt!: Date | null;

  @ApiProperty({ nullable: true })
  lastFailureAt!: Date | null;

  @ApiProperty({ nullable: true })
  lastFailureStatusCode!: number | null;

  @ApiProperty({ nullable: true })
  lastFailureMessage!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class WebhookEndpointCreatedResponseDto extends WebhookEndpointResponseDto {
  @ApiProperty()
  secret!: string;
}
