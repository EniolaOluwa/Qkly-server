import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RoleStatus } from '../entities/role.entity';

export class ChangeRoleStatusDto {
  @ApiProperty({ enum: RoleStatus, example: RoleStatus.SUSPENDED })
  @IsEnum(RoleStatus)
  status: RoleStatus;

  @ApiPropertyOptional({ example: 'Role suspended pending review' })
  @IsString()
  @IsOptional()
  reason?: string;
}
