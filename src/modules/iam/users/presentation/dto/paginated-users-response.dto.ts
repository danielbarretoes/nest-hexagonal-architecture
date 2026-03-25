import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../../shared/contracts/http/pagination-meta.dto';
import { UserResponseDto } from './user-response.dto';

export class PaginatedUsersResponseDto {
  @ApiProperty({
    type: [UserResponseDto],
  })
  items!: UserResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}
