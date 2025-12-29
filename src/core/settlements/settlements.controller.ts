import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { SettlementsService } from './settlements.service';
import { RequestPayoutDto } from './dto/request-payout.dto';

@ApiTags('Settlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) { }

  @Post('payout')
  @ApiOperation({ summary: 'Request a payout to bank account' })
  @ApiResponse({ status: 201, description: 'Payout initiated successfully' })
  async requestPayout(@Request() req, @Body() dto: RequestPayoutDto) {
    return this.settlementsService.requestPayout(req.user.userId, dto);
  }
}
