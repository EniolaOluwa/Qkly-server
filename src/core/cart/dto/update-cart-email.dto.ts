import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartEmailDto {
  @ApiProperty({ example: 'customer@example.com', description: 'Customer email address for guest checkout' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
