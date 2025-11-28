import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../core/users/entity/user.entity';
import { WalletsService } from '../../core/wallets/wallets.service';

export interface BvnVerificationData {
  bvn: string;
  customerName: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth: string;
  verification_status: string;
}

export interface WalletVerificationData {
  walletReference: string;
  walletName: string;
  customerName: string;
  bvnDetails: {
    bvn: string;
    bvnDateOfBirth: string;
  };
  customerEmail: string;
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
    private configService: ConfigService,
    private walletService: WalletsService,
  ) {}

  async provisionWalletOnBvnSuccess(
    userId: number,
    customerEmail: string,
    bvnVerificationData: BvnVerificationData,
  ): Promise<WalletProvisioningResult> {
    try {
      if (bvnVerificationData.verification_status !== 'VERIFIED') {
        return {
          success: false,
          message: 'Cannot provision wallet: BVN verification not successful',
          error: `Verification status: ${bvnVerificationData.verification_status}`,
        };
      }

      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'walletReference', 'bvn', 'firstName', 'lastName'],
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'Invalid user ID',
        };
      }

      if (user.walletReference) {
        this.logger.warn(`User ${userId} already has a wallet: ${user.walletReference}`);
        return {
          success: false,
          message: 'User already has a wallet',
          error: 'Wallet already exists',
        };
      }

      const walletReference = uuidv4();

      const envName = this.configService.get<string>('NODE_ENV', 'development');
      const walletName = `${envName}-${walletReference}`;

      // Get customer name - prefer from BVN data, fallback to user data
      const customerName =
        bvnVerificationData.customerName || `${user.firstName} ${user.lastName}`.trim();

      console.log({ customerName, envName });

      if (!customerName) {
        return {
          success: false,
          message: 'Customer name not available',
          error: 'Missing customer name from both BVN data and user record',
        };
      }

      // Create wallet through Monnify
      const walletData = await this.walletService.generateWallet(userId, {
        walletReference,
        walletName,
        customerEmail,
        customerName,
        bvn: bvnVerificationData.bvn,
        currencyCode: 'NGN',
        dateOfBirth: bvnVerificationData.dateOfBirth,
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

  extractBvnDataFromPremblyResponse(premblyResponse: any): BvnVerificationData {
    const verificationData = premblyResponse?.data || premblyResponse;

    return {
      bvn: verificationData.bvn || verificationData.searchParameter,
      customerName:
        verificationData.first_name && verificationData.last_name
          ? `${verificationData.first_name} ${verificationData.last_name}`.trim()
          : verificationData.name || verificationData.customerName,
      firstName: verificationData.first_name,
      lastName: verificationData.last_name,
      dateOfBirth: verificationData.date_of_birth || verificationData.dateOfBirth,
      verification_status: verificationData.verification_status || 'UNKNOWN',
    };
  }
}
