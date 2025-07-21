import {
  Controller,
  Post,
  Get,
  Body,
  ValidationPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import {
  GenerateWalletDto,
  GenerateWalletResponseDto,
} from '../dto/wallet.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';

@ApiTags('wallets')
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

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
}
