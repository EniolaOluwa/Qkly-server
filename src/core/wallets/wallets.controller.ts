import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
  ValidationPipe
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { WalletBalanceResponseDto } from './dto/wallet-response.dto';
import {
  GenerateWalletDto,
  GenerateWalletResponseDto,
  InitiatePaymentDto,
  PaymentResponseDto
} from './dto/wallet.dto';
import { WalletsService } from './wallets.service';

@ApiTags('wallets')
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
      wallet: walletInfo,
    };
  }


  @Get(':userId/balance')
  async getWalletBalance(@Request() req): Promise<WalletBalanceResponseDto> {
    return await this.walletsService.getUserWalletWithBalance(req.user.userId);
  }

  @Post('payments/initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initialize payment',
    description: 'Initialize a payment transaction with Monnify.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment initialized successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid payment data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to initialize payment',
  })
  async initializePayment(
    @Body(ValidationPipe) initiatePaymentDto: InitiatePaymentDto,
    @Request() req,
  ) {
    // Add user details to the payment payload
    const paymentPayload = {
      ...initiatePaymentDto,
      customerEmail: req.user.email,
      customerName: req.user.name || `${req.user.firstName} ${req.user.lastName}`,
      customerReference: req.user.userId.toString(),
      paymentMethods: this.walletsService.getPaymentMethodsForMonnify(
        initiatePaymentDto.paymentMethod
      ),
    };

    const paymentResponse = await this.walletsService.initializeMonnifyPayment(paymentPayload);

    return {
      message: 'Payment initialized successfully',
      data: paymentResponse.responseBody,
    };
  }

  @Get('payments/verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify payment',
    description: 'Verify payment status by reference.',
  })
  @ApiParam({
    name: 'reference',
    required: true,
    description: 'Payment reference to verify',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment verification successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to verify payment',
  })
  async verifyPayment(@Param('reference') reference: string) {
    const verification = await this.walletsService.verifyMonnifyPayment(reference);

    return {
      message: 'Payment verification successful',
      data: verification,
      status: verification.paymentStatus,
    };
  }
}