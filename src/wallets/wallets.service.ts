import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { User } from '../user.entity';
import { GenerateWalletDto, GenerateWalletResponseDto } from '../dto/wallet.dto';

@Injectable()
export class WalletsService {
    // Monnify API configuration loaded from environment variables

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  /**
   * Get Monnify access token for authentication
   * @returns Promise<string> Access token
   */
    private async getMonnifyAccessToken(): Promise<string> {
    try {
      const monnifyBaseUrl = this.configService.get<string>('MONNIFY_BASE_URL', 'https://sandbox.monnify.com');
      const monnifyApiKey = this.configService.get<string>('MONNIFY_API_KEY');
      const monnifySecretKey = this.configService.get<string>('MONNIFY_SECRET_KEY');

      if (!monnifyApiKey || !monnifySecretKey) {
        throw new InternalServerErrorException('Monnify API credentials not configured');
      }

      const credentials = Buffer.from(`${monnifyApiKey}:${monnifySecretKey}`).toString('base64');

      const response = await firstValueFrom(
        this.httpService.post(`${monnifyBaseUrl}/api/v1/auth/login`, {}, {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      if (response.data.requestSuccessful && response.data.responseBody?.accessToken) {
        return response.data.responseBody.accessToken;
      }

      throw new Error('Failed to get access token from Monnify');
    } catch (error) {
      console.error('Monnify authentication failed:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to authenticate with Monnify');
    }
  }

  async generateWallet(userId: number, generateWalletDto: GenerateWalletDto): Promise<GenerateWalletResponseDto> {
    try {
      // Find user by ID
      const user = await this.userRepository.findOne({ where: { id: userId } });
      
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user already has a wallet
      if (user.walletReference) {
        throw new BadRequestException('User already has a wallet');
      }

      // Get Monnify access token
      const accessToken = await this.getMonnifyAccessToken();

      const monnifyBaseUrl = this.configService.get<string>('MONNIFY_BASE_URL', 'https://sandbox.monnify.com');
      const monnifyContractCode = this.configService.get<string>('MONNIFY_CONTRACT_CODE');

      if (!monnifyContractCode) {
        throw new InternalServerErrorException('Monnify contract code not configured');
      }

      // Prepare request body for Monnify Create Wallet API
      const walletData = {
        walletReference: generateWalletDto.walletReference,
        walletName: generateWalletDto.walletName,
        customerEmail: generateWalletDto.customerEmail,
        customerName: `${user.firstName} ${user.lastName}`,
        bvn: generateWalletDto.bvn,
        currencyCode: generateWalletDto.currencyCode || 'NGN',
        contractCode: monnifyContractCode,
      };

      // Call Monnify Create Wallet API
      const response = await firstValueFrom(
        this.httpService.post(`${monnifyBaseUrl}/api/v1/disbursements/wallet`, walletData, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const walletResponse = response.data;
      
      if (!walletResponse.requestSuccessful) {
        throw new BadRequestException(walletResponse.responseMessage || 'Wallet creation failed');
      }

      const walletDetails = walletResponse.responseBody;

      // Update user with wallet information
      await this.userRepository.update(userId, {
        walletReference: walletDetails.walletReference || generateWalletDto.walletReference,
        walletAccountNumber: walletDetails.accountNumber,
        walletAccountName: walletDetails.accountName || generateWalletDto.walletName,
        walletBankName: walletDetails.bankName,
        walletBankCode: walletDetails.bankCode,
      });

      return {
        message: 'Wallet created successfully',
        success: true,
        walletReference: walletDetails.walletReference || generateWalletDto.walletReference,
        accountNumber: walletDetails.accountNumber,
        accountName: walletDetails.accountName || generateWalletDto.walletName,
        bankName: walletDetails.bankName,
        bankCode: walletDetails.bankCode,
        currencyCode: walletDetails.currencyCode || generateWalletDto.currencyCode || 'NGN',
        createdOn: walletDetails.createdOn || new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      console.error('Wallet generation failed:', error.response?.data || error.message);
      
      if (error.response?.status === 400) {
        throw new BadRequestException(error.response.data?.responseMessage || 'Invalid wallet creation data');
      }
      
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid Monnify API credentials');
      }
      
      throw new InternalServerErrorException('Failed to create wallet');
    }
  }

  async getUserWallet(userId: number): Promise<any> {
    try {
      const user = await this.userRepository.findOne({ 
        where: { id: userId },
        select: ['id', 'walletReference', 'walletAccountNumber', 'walletAccountName', 'walletBankName', 'walletBankCode']
      });
      
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.walletReference) {
        throw new NotFoundException('User does not have a wallet');
      }

      return {
        walletReference: user.walletReference,
        accountNumber: user.walletAccountNumber,
        accountName: user.walletAccountName,
        bankName: user.walletBankName,
        bankCode: user.walletBankCode,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve wallet information');
    }
  }
} 