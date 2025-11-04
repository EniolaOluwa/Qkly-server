import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../core/users/user.entity'


export interface BvnVerificationData {
  bvn: string;
  customerName: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  verification_status: string;
}


export interface WalletProvisioningResult {
  success: boolean;
  message: string;
  walletData?: {
    walletReference: string;
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
  };
  error?: string;
}

@Injectable()
export class WalletProvisioningUtil {
  private readonly logger = new Logger(WalletProvisioningUtil.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  /**
   * Provisions a Monnify wallet when BVN verification is successful
   * @param userId - User ID from JWT
   * @param customerEmail - Customer email from JWT  
   * @param bvnVerificationData - BVN and customer data from verification response
   * @returns Promise<WalletProvisioningResult>
   */
  async provisionWalletOnBvnSuccess(
    userId: number,
    customerEmail: string,
    bvnVerificationData: BvnVerificationData,
  ): Promise<WalletProvisioningResult> {
    try {
      // Validate that BVN verification was successful
      if (bvnVerificationData.verification_status !== 'VERIFIED') {
        return {
          success: false,
          message: 'Cannot provision wallet: BVN verification not successful',
          error: `Verification status: ${bvnVerificationData.verification_status}`,
        };
      }

      // Find user to check if they already have a wallet
      const user = await this.userRepository.findOne({ 
        where: { id: userId },
        select: ['id', 'walletReference', 'bvn', 'firstName', 'lastName']
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'Invalid user ID',
        };
      }

      // Check if user already has a wallet
      if (user.walletReference) {
        this.logger.warn(`User ${userId} already has a wallet: ${user.walletReference}`);
        return {
          success: false,
          message: 'User already has a wallet',
          error: 'Wallet already exists',
        };
      }

      // Generate wallet reference using UUID
      const walletReference = uuidv4();

      // Get environment name for wallet naming
      const envName = this.configService.get<string>('NODE_ENV', 'development');
      const walletName = `${envName}-${walletReference}`;

      // Get customer name - prefer from BVN data, fallback to user data
      const customerName = bvnVerificationData.customerName || 
                          `${user.firstName} ${user.lastName}`.trim();

      if (!customerName) {
        return {
          success: false,
          message: 'Customer name not available',
          error: 'Missing customer name from both BVN data and user record',
        };
      }

      // Create wallet through Monnify
      const walletData = await this.createMonnifyWallet({
        walletReference,
        walletName,
        customerEmail,
        customerName,
        bvn: bvnVerificationData.bvn,
        currencyCode: 'NGN',
      });

      // Update user record with wallet information and BVN
      await this.userRepository.update(userId, {
        walletReference: walletData.walletReference,
        walletAccountNumber: walletData.accountNumber,
        walletAccountName: walletData.accountName,
        walletBankName: walletData.bankName,
        walletBankCode: walletData.bankCode,
        bvn: bvnVerificationData.bvn, // Update BVN in user record
      });

      this.logger.log(`Successfully provisioned wallet for user ${userId}: ${walletReference}`);

      return {
        success: true,
        message: 'Wallet provisioned successfully',
        walletData: {
          walletReference: walletData.walletReference,
          accountNumber: walletData.accountNumber,
          accountName: walletData.accountName,
          bankName: walletData.bankName,
          bankCode: walletData.bankCode,
        },
      };

    } catch (error) {
      this.logger.error(`Failed to provision wallet for user ${userId}:`, error);
      return {
        success: false,
        message: 'Failed to provision wallet',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Get Monnify access token for authentication
   * @returns Promise<string> Access token
   */
  private async getMonnifyAccessToken(): Promise<string> {
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
        this.httpService.post(
          `${monnifyBaseUrl}/api/v1/auth/login`,
          {},
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/json',
            },
          },
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
      this.logger.error('Monnify authentication failed:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to authenticate with Monnify');
    }
  }

  /**
   * Create wallet through Monnify API
   * @param walletData - Wallet creation data
   * @returns Promise with wallet details
   */
  private async createMonnifyWallet(walletData: {
    walletReference: string;
    walletName: string;
    customerEmail: string;
    customerName: string;
    bvn: string;
    currencyCode: string;
  }): Promise<{
    walletReference: string;
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
  }> {
    try {
      // Get access token
      const accessToken = await this.getMonnifyAccessToken();

      const monnifyBaseUrl = this.configService.get<string>(
        'MONNIFY_BASE_URL',
        'https://sandbox.monnify.com',
      );
      const monnifyContractCode = this.configService.get<string>('MONNIFY_CONTRACT_CODE');

      if (!monnifyContractCode) {
        throw new InternalServerErrorException('Monnify contract code not configured');
      }

      // Prepare request payload
      const payload = {
        walletReference: walletData.walletReference,
        walletName: walletData.walletName,
        customerEmail: walletData.customerEmail,
        customerName: walletData.customerName,
        bvn: walletData.bvn,
        currencyCode: walletData.currencyCode,
        contractCode: monnifyContractCode,
      };

      this.logger.debug('Creating Monnify wallet with payload:', {
        ...payload,
        bvn: '***MASKED***', // Mask BVN in logs
      });

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
        ),
      );

      const walletResponse = response.data;

      if (!walletResponse.requestSuccessful) {
        throw new Error(
          walletResponse.responseMessage || 'Wallet creation failed',
        );
      }

      const walletDetails = walletResponse.responseBody;

      return {
        walletReference: walletDetails.walletReference || walletData.walletReference,
        accountNumber: walletDetails.accountNumber,
        accountName: walletDetails.accountName || walletData.walletName,
        bankName: walletDetails.bankName,
        bankCode: walletDetails.bankCode,
      };

    } catch (error) {
      this.logger.error('Monnify wallet creation failed:', error.response?.data || error.message);
      
      if (error.response?.status === 400) {
        throw new Error(
          error.response.data?.responseMessage || 'Invalid wallet creation data',
        );
      }

      if (error.response?.status === 401) {
        throw new Error('Invalid Monnify API credentials');
      }

      throw new Error('Failed to create wallet through Monnify API');
    }
  }

  /**
   * Utility method to extract BVN verification data from Prembly response
   * This can be used to structure the response data properly before calling provisionWalletOnBvnSuccess
   * @param premblyResponse - Full response from Prembly verification
   * @returns BvnVerificationData
   */
  extractBvnDataFromPremblyResponse(premblyResponse: any): BvnVerificationData {
    const verificationData = premblyResponse?.data || premblyResponse;
    
    return {
      bvn: verificationData.bvn || verificationData.searchParameter,
      customerName: verificationData.first_name && verificationData.last_name 
        ? `${verificationData.first_name} ${verificationData.last_name}`.trim()
        : verificationData.name || verificationData.customerName,
      firstName: verificationData.first_name,
      lastName: verificationData.last_name,
      dateOfBirth: verificationData.date_of_birth || verificationData.dateOfBirth,
      verification_status: verificationData.verification_status || 'UNKNOWN',
    };
  }
}
