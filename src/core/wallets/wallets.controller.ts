import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
  ValidationPipe
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { PaginationDto } from '../../common/queries/dto';
import { WalletBalanceResponseDto } from './dto/wallet-response.dto';
import {
  WalletTransferRequestDto,
  WalletTransferResponseDto
} from './dto/wallet-transfer.dto';
import {
  GenerateWalletDto,
  GenerateWalletResponseDto
} from './dto/wallet.dto';
import { WithdrawalDto, WithdrawalResponseDto } from './dto/withdraw.dto';
import { WalletsService } from './wallets.service';

@ApiTags('Wallets')
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) { }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate user wallet',
    description:
      'Creates a Monnify wallet for the authenticated user. Requires JWT authentication and user BVN.',
  })
  @ApiResponse({
    status: 201,
    description: 'Wallet created successfully',
    type: GenerateWalletResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid wallet data or user already has a wallet',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to create wallet',
  })
  async generateWallet(
    @Body(ValidationPipe) generateWalletDto: GenerateWalletDto,
    @Request() req,
  ): Promise<GenerateWalletResponseDto> {
    return this.walletsService.generateWallet(
      req.user.userId,
      generateWalletDto,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user wallet',
    description: 'Retrieves the wallet information for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet information retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - User not found or user does not have a wallet',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error - Failed to retrieve wallet information',
  })
  async getUserWallet(@Request() req) {
    const walletInfo = await this.walletsService.getUserWallet(req.user.userId);
    return {
      message: 'Wallet information retrieved successfully',
      data: walletInfo,
    };
  }


  @Get(':userId/balance')
  async getWalletBalance(@Request() req): Promise<WalletBalanceResponseDto> {
    return await this.walletsService.getUserWalletWithBalance(req.user.userId);
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get wallet balance',
    description: 'Retrieves the current wallet balance (including Paystack Subaccount balance if applicable).',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
    type: WalletBalanceResponseDto,
  })
  async getOwnWalletBalance(@Request() req: any): Promise<WalletBalanceResponseDto> {
    return await this.walletsService.getUserWalletWithBalance(req.user.id);
  }

  @Post('payout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request Payout',
    description: 'Initiates a withdrawal from the user subaccount to linked bank account.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payout initiated successfully',
    type: WithdrawalResponseDto,
  })
  async requestPayout(@Request() req: any, @Body() payload: WithdrawalDto): Promise<WithdrawalResponseDto> {
    return await this.walletsService.withdrawToBankAccount(req.user.id, payload);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Transfer funds',
    description: 'Transfer funds from wallet to bank account or another wallet.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transfer initiated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid transfer data or insufficient balance',
  })
  async transferFunds(
    @Body(ValidationPipe) transferDto: WalletTransferRequestDto,
    @Request() req,
  ): Promise<WalletTransferResponseDto> {
    // Ensure source wallet belongs to user (optional validation, service handles logic)
    // For now we assume the service checks or we trust the input. 
    // Ideally, we should override sourceAccountNumber with the user's wallet reference
    // but the DTO allows specifying it. 

    // Better security: Force source to be user's wallet
    const userWallet = await this.walletsService.getUserWallet(req.user.userId);
    transferDto.sourceAccountNumber = userWallet.walletReference;

    return await this.walletsService.transferToWalletOrBank(transferDto);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Withdraw funds to bank account',
    description: 'Withdraw funds from wallet to a linked bank account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal initiated successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid PIN or insufficient balance',
  })
  async withdraw(
    @Body(ValidationPipe) withdrawalDto: WithdrawalDto,
    @Request() req,
  ): Promise<WithdrawalResponseDto> {
    return await this.walletsService.withdrawToBankAccount(
      req.user.userId,
      withdrawalDto,
    );
  }



  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get wallet transactions',
    description: 'Retrieves all financial transactions (credits, debits, refunds, settlements) for the user wallet.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 20)' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  async getWalletTransactions(
    @Request() req,
    @Query() query: PaginationDto,
  ) {
    return await this.walletsService.getWalletTransactions(
      req.user.userId,
      query.page || 1,
      query.limit || 20,
    );
  }
}