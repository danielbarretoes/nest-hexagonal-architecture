/**
 * Login request DTO.
 */

import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginRequestDto {
  @ApiProperty({
    example: 'john@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
