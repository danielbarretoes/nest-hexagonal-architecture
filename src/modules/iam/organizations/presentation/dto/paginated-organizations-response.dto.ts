import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../../shared/contracts/http/pagination-meta.dto';
import { OrganizationResponseDto } from './organization-response.dto';

export class PaginatedOrganizationsResponseDto {
  @ApiProperty({
    type: [OrganizationResponseDto],
  })
  items!: OrganizationResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}
