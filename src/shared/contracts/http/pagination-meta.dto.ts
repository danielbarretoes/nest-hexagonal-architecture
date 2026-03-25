import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 25 })
  totalItems!: number;

  @ApiProperty({ example: 10 })
  itemCount!: number;

  @ApiProperty({ example: 10 })
  itemsPerPage!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}
