import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEnum, IsArray, IsNumber } from "class-validator";
import { UserType } from "../../../common/auth/user-role.enum";

export class CreateRoleDto {
  @ApiProperty({ example: 'Sales Manager' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Manages sales team and transactions' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: UserType, example: UserType.ADMIN })
  @IsEnum(UserType)
  @IsNotEmpty()
  userType: UserType;

  @ApiPropertyOptional({
    example: ['users.read', 'transactions.read', 'reports.read'],
    description: 'Array of permission strings',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({ example: 5, description: 'Role priority (higher = more privileges)' })
  @IsNumber()
  @IsOptional()
  priority?: number;
}
