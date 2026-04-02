import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyResponseDto } from './api-key-response.dto';

export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
  @ApiProperty({
    example:
      'hex_test_f73c93dc-5d73-4935-a1a1-29240480856c.4rqg2UoGI7IQjOGn9LZ1x5trq8Pl7vF7eXqdYqU5lJw',
  })
  apiKey!: string;
}
