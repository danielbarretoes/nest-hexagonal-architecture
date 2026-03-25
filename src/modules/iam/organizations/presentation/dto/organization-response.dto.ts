import { ApiProperty } from '@nestjs/swagger';

export class OrganizationResponseDto {
  @ApiProperty({
    example: '7c9b2c7c-4793-4c1f-826b-cba2d9795058',
  })
  id!: string;

  @ApiProperty({
    example: 'Acme',
  })
  name!: string;

  @ApiProperty({
    example: '2026-03-25T22:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-03-25T22:00:00.000Z',
  })
  updatedAt!: Date;
}
