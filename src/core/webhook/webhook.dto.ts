import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class MonnifyWebhookDto {
  @ApiProperty({ example: 'SUCCESSFUL_TRANSACTION' })
  @IsNotEmpty()
  @IsString()
  eventType: string;

  @ApiProperty({ type: Object })
  @IsNotEmpty()
  @IsObject()
  eventData: any;
}
