import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Admin } from '../../common/decorators/admin.decorator';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionFilterDto } from '../transaction/dto/transaction-filter.dto';
import { TransactionMetricsDto } from '../transaction/dto/transaction-metric.dto';
import { PaginationResultDto } from '../../common/queries/dto';
import { Transaction } from '../transaction/entity/transaction.entity';
import { HttpResponse } from '../../common/utils/http-response.utils';

@Admin()
@ApiTags('Admin Transactions')
@ApiBearerAuth()
@Controller('admin/transactions')
export class AdminTransactionsController {
  constructor(private readonly transactionService: TransactionService) { }

  @Get('metrics')
  @ApiOperation({
    summary: 'Get comprehensive transaction metrics with trends',
    description: 'Retrieves total volume, transaction counts, success rates, and average values with percentage trends comparing the current month to the last month. Also includes channel breakdown and 30-day volume history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics retrieved successfully',
    type: TransactionMetricsDto,
  })
  async getMetrics() {
    const data = await this.transactionService.getMetrics();
    return HttpResponse.success({
      message: 'Transaction metrics retrieved successfully',
      data,
    });
  }

  @Get('list')
  @ApiOperation({
    summary: 'Get paginated list of transactions',
    description: 'Filter by search, status, type, user, business, or date range.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    // type: PaginationResultDto<Transaction> // Swagger struggling with generics sometimes, keeping generic description
  })
  async findAll(@Query() filterDto: TransactionFilterDto) {
    const result = await this.transactionService.findAll(filterDto);
    return HttpResponse.success({
      message: 'Transactions retrieved successfully',
      ...result,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get transaction details',
    description: 'Retrieves detailed information about a specific transaction.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
    type: Transaction,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.transactionService.findOne(id);
    return HttpResponse.success({
      message: 'Transaction details retrieved successfully',
      data,
    });
  }
}
