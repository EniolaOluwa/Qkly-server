import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { TransferService } from './transfer.service';
import { InitiateTransferDto, FinalizeTransferDto } from './dto/transfer.dto';
import { HttpResponse } from '../../common/utils/http-response.utils';

@ApiTags('Transfers')
@Controller('transfers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransferController {
  constructor(private readonly transferService: TransferService) { }

  @Post('initiate')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Initiate a transfer',
    description: 'Initiates a transfer from the user wallet to a bank account. May require OTP.',
  })
  @ApiResponse({ status: 200, description: 'Transfer initiated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Insufficient funds or invalid details' })
  async initiateTransfer(
    @Body(ValidationPipe) dto: InitiateTransferDto,
    @Request() req,
  ) {
    const data = await this.transferService.initiateTransfer(req.user.userId, dto);
    return HttpResponse.success({
      message: data.message,
      data,
    });
  }

  @Post('finalize')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Finalize a transfer with OTP',
    description: 'Completes a transfer that requires OTP verification.',
  })
  @ApiResponse({ status: 200, description: 'Transfer finalized successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid OTP' })
  async finalizeTransfer(
    @Body(ValidationPipe) dto: FinalizeTransferDto,
    @Request() req,
  ) {
    const data = await this.transferService.finalizeTransfer(req.user.userId, dto);
    return HttpResponse.success({
      message: data.message,
      data,
    });
  }
}
