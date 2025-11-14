import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { User } from '../users/user.entity';
import {
  GenerateWalletDto,
  GenerateWalletResponseDto,
} from './dto/wallet.dto';
import {
  MonnifyAxiosError,
  MonnifySuccessResponse,
  MonnifyAuthResponseBody,
  MonnifyPaymentInitResponseBody,
  MonnifyTransactionResponseBody
} from './interfaces/monnify-response.interface';
import { DateHelper } from '../../common/utils';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }


  async getMonnifyAccessToken(): Promise<string> {
    try {
      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );
      const monnifyApiKey = this.configService.get<string>('MONNIFY_API_KEY');
      const monnifySecretKey = this.configService.get<string>('MONNIFY_SECRET_KEY');

      if (!monnifyApiKey || !monnifySecretKey) {
        throw new InternalServerErrorException(
          'Monnify API credentials not configured',
        );
      }

      const credentials = Buffer.from(
        `${monnifyApiKey}:${monnifySecretKey}`,
      ).toString('base64');

      const response = await firstValueFrom(
        this.httpService.post<MonnifySuccessResponse<MonnifyAuthResponseBody>>(
          `${monnifyBaseUrl}/api/v1/auth/login`,
          {},
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/json',
            },
          },
        ).pipe(
          catchError((error: MonnifyAxiosError) => {
            this.logger.error(
              'Monnify authentication failed:',
              error.response?.data || error.message,
            );
            throw new InternalServerErrorException(
              `Failed to authenticate with Monnify: ${error.response?.data?.responseMessage || error.message}`,
            );
          }),
        ),
      );

      if (
        response.data.requestSuccessful &&
        response.data.responseBody?.accessToken
      ) {
        return response.data.responseBody.accessToken;
      }

      throw new Error('Failed to get access token from Monnify');
    } catch (error) {
      this.logger.error(
        'Monnify authentication failed:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'Failed to authenticate with Monnify',
      );
    }
  }


  async initializeMonnifyPayment(payload: any): Promise<MonnifySuccessResponse<MonnifyPaymentInitResponseBody>> {
    try {
      this.logger.debug(`Monnify Payload: ${JSON.stringify(payload, null, 2)}`);

      const accessToken = await this.getMonnifyAccessToken();
      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );

      const response = await firstValueFrom(
        this.httpService.post<MonnifySuccessResponse<MonnifyPaymentInitResponseBody>>(
          `${monnifyBaseUrl}/api/v1/merchant/transactions/init-transaction`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ).pipe(
          catchError((error: MonnifyAxiosError) => {
            this.logger.error(
              `Monnify payment initialization failed: ${JSON.stringify(error.response?.data)}`,
            );
            throw new InternalServerErrorException(
              `Failed to initialize payment: ${error.response?.data?.responseMessage || error.message}`,
            );
          }),
        ),
      );

      const paymentResponse = response.data;

      if (!paymentResponse.requestSuccessful) {
        throw new InternalServerErrorException(
          paymentResponse.responseMessage || 'Payment initialization failed',
        );
      }

      return paymentResponse;
    } catch (error) {
      this.logger.error(
        `Payment initialization failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verify payment status with Monnify
   * @param paymentReference - The payment reference to verify
   * @returns Promise<MonnifyTransactionResponseBody> - Transaction details
   */
  async verifyMonnifyPayment(paymentReference: string): Promise<MonnifyTransactionResponseBody> {
    try {
      const accessToken = await this.getMonnifyAccessToken();
      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );

      const response = await firstValueFrom(
        this.httpService.get<MonnifySuccessResponse<MonnifyTransactionResponseBody>>(
          `${monnifyBaseUrl}/api/v1/merchant/transactions/query?paymentReference=${paymentReference}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ).pipe(
          catchError((error: MonnifyAxiosError) => {
            this.logger.error(
              `Monnify payment verification failed: ${JSON.stringify(error.response?.data)}`,
            );
            throw new InternalServerErrorException(
              `Failed to verify payment: ${error.response?.data?.responseMessage || error.message}`,
            );
          }),
        ),
      );

      const verificationResponse = response.data;

      if (!verificationResponse.requestSuccessful) {
        throw new InternalServerErrorException(
          verificationResponse.responseMessage || 'Payment verification failed',
        );
      }

      return verificationResponse.responseBody;
    } catch (error) {
      this.logger.error(
        `Payment verification failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Map payment methods to Monnify format
   * @param paymentMethod - The payment method
   * @returns string[] - Array of payment methods for Monnify
   */
  getPaymentMethodsForMonnify(paymentMethod: string): string[] {
    switch (paymentMethod) {
      case 'CARD':
        return ['CARD'];
      case 'BANK_TRANSFER':
        return ['ACCOUNT_TRANSFER'];
      default:
        return ['CARD', 'ACCOUNT_TRANSFER'];
    }
  }

  async generateWallet(
    userId: number,
    generateWalletDto: GenerateWalletDto,
  ): Promise<GenerateWalletResponseDto> {
    try {
      // Find user by ID
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.walletReference) {
        throw new BadRequestException('User already has a wallet');
      }


      // Get Monnify access token
      const accessToken = await this.getMonnifyAccessToken();


      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );
      const monnifyContractCode = this.configService.get<string>(
        'MONNIFY_CONTRACT_CODE',
      );

      if (!monnifyContractCode) {
        throw new InternalServerErrorException(
          'Monnify contract code not configured',
        );
      }

      // Prepare request body for Monnify Create Wallet API
      const payload = {
        walletReference: generateWalletDto.walletReference,
        walletName: generateWalletDto.walletName,
        customerEmail: generateWalletDto.customerEmail,
        customerName: `${user.firstName} ${user.lastName}`,
        // customerName: generateWalletDto.customerName ?? `${user.firstName} ${user.lastName}`,
        bvnDetails: {
          bvn: generateWalletDto.bvn,
          bvnDateOfBirth: generateWalletDto.dateOfBirth
        },
      };



      // Call Monnify Create Wallet API
      const response = await firstValueFrom(
        this.httpService.post(
          `${monnifyBaseUrl}/api/v1/disbursements/wallet`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ).pipe(
          catchError((error: MonnifyAxiosError) => {
            this.logger.error(
              `Failed to create wallet: ${JSON.stringify(error.response?.data)}`,
            );

            if (error.response?.status === 400) {
              throw new BadRequestException(
                error.response.data?.responseMessage || 'Invalid wallet creation data',
              );
            }

            if (error.response?.status === 401) {
              throw new UnauthorizedException('Invalid Monnify API credentials');
            }

            throw new InternalServerErrorException(
              `Failed to create wallet: ${error.response?.data?.responseMessage || error.message}`,
            );
          }),
        ),
      );

      const walletResponse = response.data;

      if (!walletResponse.requestSuccessful) {
        throw new BadRequestException(
          walletResponse.responseMessage || 'Wallet creation failed',
        );
      }

      const walletDetails = walletResponse.responseBody;


      console.log({ walletDetails });

      // Update user with wallet information
      await this.userRepository.update(userId, {
        walletReference:
          walletDetails.walletReference || generateWalletDto.walletReference,
        walletAccountNumber: walletDetails.accountNumber,
        walletAccountName:
          walletDetails.accountName || generateWalletDto.walletName,
        walletBankName: walletDetails.bankName,
        walletBankCode: walletDetails.bankCode,
      });

      return {
        message: 'Wallet created successfully',
        success: true,
        walletReference:
          walletDetails.walletReference || generateWalletDto.walletReference,
        accountNumber: walletDetails.accountNumber,
        accountName: walletDetails.accountName || generateWalletDto.walletName,
        bankName: walletDetails.bankName,
        bankCode: walletDetails.bankCode,
        currencyCode:
          walletDetails.currencyCode || generateWalletDto.currencyCode || 'NGN',
        createdOn: walletDetails.createdOn || new Date().toISOString(),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error(
        'Wallet generation failed:',
        error.response?.data || error.message,
      );

      throw new InternalServerErrorException('Failed to create wallet');
    }
  }

  async getUserWallet(userId: number): Promise<any> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: [
          'id',
          'walletReference',
          'walletAccountNumber',
          'walletAccountName',
          'walletBankName',
          'walletBankCode',
        ],
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
      throw new InternalServerErrorException(
        'Failed to retrieve wallet information',
      );
    }
  }
}