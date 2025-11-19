import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsString,
  Min,
  IsPositive,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentStatus, PaymentMethod, DeliveryMethod, OrderItemStatus } from '../interfaces/order.interface';
import { PaginationDto } from '../../../common/queries/dto';

export class FindAllOrdersDto extends PaginationDto {
  @ApiProperty({
    description: 'Filter by user ID',
    required: false,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiProperty({
    description: 'Filter by business ID',
    required: false,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  businessId?: number;

  @ApiProperty({
    description: 'Filter by order status',
    required: false,
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({
    description: 'Filter by payment status',
    required: false,
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiProperty({
    description: 'Filter by payment method',
    required: false,
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    description: 'Filter by delivery method',
    required: false,
    enum: DeliveryMethod,
  })
  @IsOptional()
  @IsEnum(DeliveryMethod)
  deliveryMethod?: DeliveryMethod;

  @ApiProperty({
    description: 'Minimum total amount',
    required: false,
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minTotal?: number;

  @ApiProperty({
    description: 'Maximum total amount',
    required: false,
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  maxTotal?: number;

  @ApiProperty({
    description: 'Search text for order reference, customer name, email or phone',
    required: false,
    example: 'John',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Start date for filtering (ISO format)',
    required: false,
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for filtering (ISO format)',
    required: false,
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Sort field',
    required: false,
    enum: ['id', 'status', 'paymentStatus', 'total', 'createdAt', 'updatedAt'],
    default: 'createdAt',
  })
  @IsOptional()
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    required: false,
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New order status',
    enum: OrderStatus,
    example: OrderStatus.PROCESSING
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiProperty({
    description: 'Notes or reason for status change',
    example: 'Order confirmed and processing started',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Additional metadata for status change',
    example: { changedBy: 'admin', reason: 'customer request' },
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateOrderItemStatusDto {
  @ApiProperty({
    description: 'New order item status',
    enum: OrderItemStatus,
    example: OrderItemStatus.PROCESSING
  })
  @IsEnum(OrderItemStatus)
  status: OrderItemStatus;

  @ApiProperty({
    description: 'Notes or reason for status change',
    example: 'Product shipped separately',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}