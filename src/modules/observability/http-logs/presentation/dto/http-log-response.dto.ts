import { ApiProperty } from '@nestjs/swagger';

export class HttpLogResponseDto {
  @ApiProperty({ example: '5179a0d3-a33c-4f36-afbd-40833560ab95' })
  id!: string;

  @ApiProperty({ example: 'POST' })
  method!: string;

  @ApiProperty({ example: '/api/v1/users' })
  path!: string;

  @ApiProperty({ example: 201 })
  statusCode!: number;

  @ApiProperty({
    nullable: true,
    example: { email: 'john@example.com', password: '[REDACTED]' },
  })
  requestBody!: unknown;

  @ApiProperty({
    nullable: true,
    example: { page: '1', limit: '10' },
  })
  queryParams!: unknown;

  @ApiProperty({
    nullable: true,
    example: { id: '5179a0d3-a33c-4f36-afbd-40833560ab95' },
  })
  routeParams!: unknown;

  @ApiProperty({
    nullable: true,
    example: { id: '5179a0d3-a33c-4f36-afbd-40833560ab95', email: 'john@example.com' },
  })
  responseBody!: unknown;

  @ApiProperty({ nullable: true, example: 'Invalid email or password' })
  errorMessage!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'Error: Invalid email or password\\n    at LoginUseCase.execute ...',
  })
  errorTrace!: string | null;

  @ApiProperty({ example: 12 })
  durationMs!: number;

  @ApiProperty({
    nullable: true,
    example: '8f3aa1cc-c8d8-40cb-b98b-92d8bdd2f1cb',
  })
  userId!: string | null;

  @ApiProperty({
    nullable: true,
    example: '7c9b2c7c-4793-4c1f-826b-cba2d9795058',
  })
  organizationId!: string | null;

  @ApiProperty({
    nullable: true,
    example: '995745f6-5803-489c-ad5f-b4ff790ce7c0',
  })
  traceId!: string | null;

  @ApiProperty({ example: '2026-03-25T22:00:00.000Z' })
  createdAt!: Date;
}
