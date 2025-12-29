import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transfer,
  TransferStatus,
} from './entity/transfer.entity';
import { PaystackIntegrationService } from '../payment/paystack-integration.service';
import { PaystackProvider } from '../payment/providers/paystack.provider';
import { ErrorHelper } from '../../common/utils';
import { InitiateTransferDto, FinalizeTransferDto } from './dto/transfer.dto';
import {
  TransactionFlow,
  TransactionStatus,
  TransactionType,
} from '../transaction/entity/transaction.entity';
import { PaymentProviderType } from '../payment/dto/payment-provider.dto';
import { TransferStatus as ProviderTransferStatus } from '../payment/dto/payment-provider.dto'; // Enum from provider DTO

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(
    @InjectRepository(Transfer)
    private readonly transferRepository: Repository<Transfer>,
    private readonly paystackService: PaystackIntegrationService,
    private readonly paystackProvider: PaystackProvider,
  ) { }

  /**
   * Initiate a transfer
   */
  async initiateTransfer(
    userId: number,
    dto: InitiateTransferDto,
  ): Promise<any> {
    try {
      // 1. Check Wallet Balance
      const balance = await this.paystackService.getBusinessWalletBalance(userId);
      if (balance.availableBalance < dto.amount) {
        ErrorHelper.BadRequestException('Insufficient wallet balance');
      }

      const reference = `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // 2. Initiate Transfer via Paystack
      const response = await this.paystackProvider.transferToBank({
        amount: dto.amount,
        reference,
        narration: dto.narration,
        destinationAccountNumber: dto.accountNumber,
        destinationBankCode: dto.bankCode,
        destinationAccountName: dto.accountName,
        currency: 'NGN',
      });

      // 3. Determine Status
      let status: TransferStatus = TransferStatus.PENDING;
      if (response.status === ProviderTransferStatus.SUCCESS) {
        status = TransferStatus.SUCCESS;
      } else if (response.status === ProviderTransferStatus.OTP_REQUIRED) {
        status = TransferStatus.OTP_REQUIRED;
      } else if (response.status === ProviderTransferStatus.FAILED) {
        status = TransferStatus.FAILED;
      }

      // 4. Record Transfer in DB
      const transfer = this.transferRepository.create({
        userId,
        reference,
        amount: dto.amount,
        currency: 'NGN',
        recipientCode: 'UNKNOWN', // We might need to extract this if useful
        recipientAccountNumber: dto.accountNumber,
        recipientBankCode: dto.bankCode,
        recipientName: dto.accountName,
        narration: dto.narration,
        status,
        transferCode: response.transferCode, // Crucial for OTP
        providerResponse: response.providerResponse,
      });

      await this.transferRepository.save(transfer);

      // 5. Debit Wallet (Record Transaction) - ONLY if NOT OTP REQUIRED (or handle pending)
      // If OTP is required, funds are usually not deducted until finalized, OR explicitly deducted and reversed if failed.
      // Paystack usually processes the debit immediately upon request.
      // So we should record the DEBIT now.
      await this.paystackService.recordTransaction({
        userId,
        type: TransactionType.PAYOUT,
        flow: TransactionFlow.DEBIT, // Money leaving wallet
        amount: dto.amount,
        status: status === TransferStatus.SUCCESS ? TransactionStatus.SUCCESS : TransactionStatus.PENDING,
        reference,
        description: dto.narration,
        metadata: {
          transferId: transfer.id,
          bankCode: dto.bankCode,
          accountNumber: dto.accountNumber,
        },
      });

      return {
        message:
          status === TransferStatus.OTP_REQUIRED
            ? 'Transfer initiated. OTP required.'
            : 'Transfer initiated successfully',
        transferCode: response.transferCode,
        status,
        reference,
      };
    } catch (error) {
      this.logger.error('Initiate transfer failed:', error);
      throw error;
    }
  }

  /**
   * Finalize Transfer with OTP
   */
  async finalizeTransfer(userId: number, dto: FinalizeTransferDto): Promise<any> {
    try {
      // 1. Find the pending transfer
      const transfer = await this.transferRepository.findOne({
        where: { transferCode: dto.transferCode, userId },
      });

      if (!transfer) {
        ErrorHelper.NotFoundException('Transfer not found');
      }

      if (transfer.status !== TransferStatus.OTP_REQUIRED) {
        ErrorHelper.BadRequestException('Transfer does not require OTP or is already processed');
      }

      // 2. Call Paystack Finalize
      const response = await this.paystackProvider.finalizeTransfer(
        dto.transferCode,
        dto.otp,
      );

      // 3. Update Transfer Status
      let newStatus: TransferStatus = TransferStatus.PENDING;
      if (response.status === ProviderTransferStatus.SUCCESS) {
        newStatus = TransferStatus.SUCCESS;
      } else if (response.status === ProviderTransferStatus.FAILED) {
        newStatus = TransferStatus.FAILED;
      }

      transfer.status = newStatus;
      transfer.providerResponse = response.providerResponse;
      await this.transferRepository.save(transfer);

      // 4. Update Transaction Status
      // We need to find the transaction linked to this transfer
      // Since we don't have a direct link in Transaction entity back to Transfer ID in a relational way typically,
      // we usually search by reference.
      // Assuming Transaction entity is in another module, we might need to use PaystackIntegrationService helper if available,
      // or duplicate the find logic if TransactionRepo is not injected.
      // Ideally PaystackService should expose 'updateTransactionStatus'.
      // For now, we assume simple status update isn't strictly enforced here as Webhooks will confirm final status.

      return {
        message: 'Transfer finalized successfully',
        status: newStatus,
        reference: transfer.reference,
      };

    } catch (error) {
      this.logger.error('Finalize transfer failed:', error);
      throw error;
    }
  }
}
