import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../../shared/contracts/http/pagination-meta.dto';
import { ApiKeyResponseDto } from './api-key-response.dto';

export class PaginatedApiKeysResponseDto {
  @ApiProperty({
    type: [ApiKeyResponseDto],
  })
  items!: ApiKeyResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}
