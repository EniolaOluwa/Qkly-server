import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ example: 2 })
  @IsNumber()
  @IsNotEmpty()
  roleId: number;
}