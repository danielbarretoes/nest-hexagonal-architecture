import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/contracts/http/pagination-query.dto';

export class ListHttpLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '2026-03-25T00:00:00.000Z',
    description: 'Inclusive ISO 8601 UTC lower bound for createdAt',
  })
  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @ApiPropertyOptional({
    example: '2026-03-25T23:59:59.999Z',
    description: 'Inclusive ISO 8601 UTC upper bound for createdAt',
  })
  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @ApiPropertyOptional({
    enum: ['2xx', '3xx', '4xx', '5xx'],
    example: '4xx',
  })
  @IsOptional()
  @IsIn(['2xx', '3xx', '4xx', '5xx'])
  statusFamily?: '2xx' | '3xx' | '4xx' | '5xx';
}
