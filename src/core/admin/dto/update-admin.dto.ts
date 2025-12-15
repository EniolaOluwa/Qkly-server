import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsNumber, IsOptional } from 'class-validator';

export class UpdateAdminDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'newemail@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 3, description: 'New role ID' })
  @IsNumber()
  @IsOptional()
  roleId?: number;
}