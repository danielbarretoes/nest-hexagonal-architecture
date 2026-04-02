import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../shared/contracts/http/pagination-meta.dto';
import { WebhookEndpointResponseDto } from './webhook-endpoint-response.dto';

export class PaginatedWebhookEndpointsResponseDto {
  @ApiProperty({ type: [WebhookEndpointResponseDto] })
  items!: WebhookEndpointResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
