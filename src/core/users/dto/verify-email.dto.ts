import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: '123456', description: 'The verification token/OTP sent to email' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
