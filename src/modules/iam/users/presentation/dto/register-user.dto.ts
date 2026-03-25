/**
 * Register user request DTO.
 */

import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({
    example: 'john@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({
    example: 'John',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({
    example: 'Doe',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;
}
