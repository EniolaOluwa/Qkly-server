
import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from './wallets.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction, TransactionStatus } from '../transaction/entity/transaction.entity';
import { User } from '../users/entity/user.entity';
import { PaymentService } from '../payment/payment.service';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import { DataSource, EntityManager } from 'typeorm';
import { WalletTransferRequestDto } from './dto/wallet-transfer.dto';
import { BadRequestException, InternalServerErrorException, HttpException } from '@nestjs/common';

describe('WalletsService', () => {
  let service: WalletsService;
  let paymentService: PaymentService;
  let walletRepository: any;
  let transactionRepository: any;

  // Mock Data
  const mockUser = { id: 1 };
  const mockWallet = {
    id: 1,
    userId: 1,
    providerAccountId: 'WALLET-123',
    availableBalance: 10000,
    ledgerBalance: 10000,
    currency: 'NGN',
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((cb) => cb(mockEntityManager)),
  };

  const mockPaymentService = {
    transferToBank: jest.fn(),
  };

  const mockBankAccountsService = {
    getBankAccount: jest.fn(),
  };

  const mockTransactionRepository = {
    update: jest.fn(),
  };

  const mockWalletRepository = {
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };


  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockWalletRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: BankAccountsService,
          useValue: mockBankAccountsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
    paymentService = module.get<PaymentService>(PaymentService);
    walletRepository = module.get(getRepositoryToken(Wallet));
    transactionRepository = module.get(getRepositoryToken(Transaction));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transferToWalletOrBank', () => {
    const transferDto: WalletTransferRequestDto = {
      amount: 5000,
      reference: 'REF-001',
      narration: 'Test Transfer',
      destinationAccountNumber: '0000000000',
      destinationBankCode: '057',
      sourceAccountNumber: 'WALLET-123',
    };

    it('should fail if wallet not found', async () => {
      mockWalletRepository.findOne.mockResolvedValue(null);

      await expect(service.transferToWalletOrBank(transferDto)).rejects.toThrow();
    });

    it('should fail if insufficient balance', async () => {
      mockWalletRepository.findOne.mockResolvedValue(mockWallet); // Finding wallet for check
      mockEntityManager.findOne.mockResolvedValue({ ...mockWallet, availableBalance: 100 }); // Finding inside transaction

      await expect(service.transferToWalletOrBank(transferDto)).rejects.toThrow(HttpException);
    });

    it('should successfully debit and transfer', async () => {
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockEntityManager.findOne.mockResolvedValue({ ...mockWallet, availableBalance: 10000 });
      mockPaymentService.transferToBank.mockResolvedValue({ status: 'SUCCESS' });
      mockEntityManager.save.mockResolvedValue({}); // For wallet save and transaction save
      mockEntityManager.create.mockReturnValue({});

      const result = await service.transferToWalletOrBank(transferDto);

      expect(result.status).toBe('SUCCESS');
      // Verify Debit Called
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(mockPaymentService.transferToBank).toHaveBeenCalledWith(expect.objectContaining({
        amount: 5000,
        reference: 'REF-001',
      }));
    });

    it('should REVERSE the debit if external transfer fails', async () => {
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      // First call (Debit): Has balance
      // Second call (Credit/Reversal): Should also find wallet
      mockEntityManager.findOne.mockResolvedValue({ ...mockWallet, availableBalance: 10000 });

      const externalError = new Error('Paystack Error');
      mockPaymentService.transferToBank.mockRejectedValue(externalError);

      await expect(service.transferToWalletOrBank(transferDto)).rejects.toThrow(HttpException);

      // Verify Reversal Logic
      // 1. Debit happened
      // 2. Transfer failed
      // 3. Credit happened

      // We expect debitWallet and creditWallet to have been called. 
      // Since they are internal/private, we verify side effects:
      // mockEntityManager.save should be called multiple times (Debit Wallet, Debit Tx, Credit Wallet, Credit Tx)
      expect(mockEntityManager.save).toHaveBeenCalledTimes(4);

      // Verify Transaction update to REVERSED
      expect(transactionRepository.update).toHaveBeenCalledWith(
        { reference: 'REF-001' },
        { status: TransactionStatus.REVERSED }
      );
    });
  });
});
