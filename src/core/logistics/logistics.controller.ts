import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ShipBubbleService } from './shipbubble.service';
import { ValidateAddressDto, FetchRatesDto } from './dto/shipbubble.dto';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@ApiTags('Logistics')
@Controller('logistics')
export class LogisticsController {
  constructor(private readonly shipBubbleService: ShipBubbleService) { }

  @Post('address/validate')
  @ApiOperation({ summary: 'Validate address and get address code' })
  async validateAddress(@Body() dto: ValidateAddressDto) {
    return this.shipBubbleService.validateAddress(dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get package categories for rates' })
  async getCategories() {
    return this.shipBubbleService.getPackageCategories();
  }

  @Post('rates')
  @ApiOperation({ summary: 'Fetch shipping rates' })
  async fetchRates(@Body() dto: FetchRatesDto) {
    return this.shipBubbleService.fetchRates(dto);
  }
}
