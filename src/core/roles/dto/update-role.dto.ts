import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, MaxLength, IsEnum, IsArray, IsNumber } from "class-validator";
import { UserType } from "../../../common/auth/user-role.enum";

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Senior Sales Manager' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Manages senior sales operations' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: UserType })
  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;

  @ApiPropertyOptional({
    example: ['users.read', 'users.write', 'transactions.read'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({ example: 7 })
  @IsNumber()
  @IsOptional()
  priority?: number;
}
