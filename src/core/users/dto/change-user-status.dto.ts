import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsString, IsOptional } from "class-validator";
import { UserStatus } from "../entity/user.entity";

export class ChangeUserStatusDto {
  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiPropertyOptional({ example: 'Account reactivated after review' })
  @IsString()
  @IsOptional()
  reason?: string;
}