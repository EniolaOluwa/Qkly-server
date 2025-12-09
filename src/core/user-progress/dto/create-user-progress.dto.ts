import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserProgressEvent } from '../entities/user-progress.entity';

export class RecordProgressDto {
  @ApiProperty({ enum: UserProgressEvent })
  @IsEnum(UserProgressEvent)
  event: UserProgressEvent;
}
