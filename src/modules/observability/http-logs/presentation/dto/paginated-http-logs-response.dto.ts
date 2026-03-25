import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../../shared/contracts/http/pagination-meta.dto';
import { HttpLogResponseDto } from './http-log-response.dto';

export class PaginatedHttpLogsResponseDto {
  @ApiProperty({ type: [HttpLogResponseDto] })
  items!: HttpLogResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
