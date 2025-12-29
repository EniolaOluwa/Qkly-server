import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export enum RestockOperation {
  ADD = 'ADD',
  SET = 'SET',
}

export class RestockProductDto {
  @ApiProperty({
    description: 'Quantity to add (or set)',
    example: 50,
  })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({
    description: 'ID of the variant to restock (if product has variations)',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  variantId?: number;

  @ApiProperty({
    description: 'Operation type: ADD to existing stock or SET to specific value',
    enum: RestockOperation,
    example: RestockOperation.ADD,
    default: RestockOperation.ADD,
    required: false,
  })
  @IsOptional()
  @IsEnum(RestockOperation)
  operation?: RestockOperation = RestockOperation.ADD;
}
