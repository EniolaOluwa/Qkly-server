import { ApiProperty } from '@nestjs/swagger';

export class BaseHttpResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  meta?: Record<string, any>;

  @ApiProperty({ required: false })
  data?: T;
}
