import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: '8f3aa1cc-c8d8-40cb-b98b-92d8bdd2f1cb',
  })
  id!: string;

  @ApiProperty({
    example: 'john@example.com',
  })
  email!: string;

  @ApiProperty({
    example: 'John',
  })
  firstName!: string;

  @ApiProperty({
    example: 'Doe',
  })
  lastName!: string;

  @ApiProperty({
    example: 'John Doe',
  })
  fullName!: string;

  @ApiProperty({
    example: '2026-03-25T22:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-03-25T22:00:00.000Z',
  })
  updatedAt!: Date;
}
