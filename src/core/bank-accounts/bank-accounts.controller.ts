import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { BankAccountsService } from './bank-accounts.service';
import { AddBankAccountDto } from './dto/add-bank-account.dto';

@ApiTags('Bank Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) { }

  @Post()
  @ApiOperation({ summary: 'Add a new bank account' })
  @ApiResponse({ status: 201, description: 'Bank account added successfully' })
  async addBankAccount(@Request() req, @Body() dto: AddBankAccountDto) {
    return this.bankAccountsService.addBankAccount(
      req.user.userId,
      dto.accountNumber,
      dto.bankCode,
      dto.currency,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all bank accounts for user' })
  async getUserBankAccounts(@Request() req) {
    return this.bankAccountsService.getUserBankAccounts(req.user.userId);
  }

  @Get('banks')
  @ApiOperation({ summary: 'Get list of supported banks' })
  async getBankList() {
    return this.bankAccountsService.getBankList();
  }

  @Get('resolve')
  @ApiOperation({ summary: 'Resolve account name' })
  async resolveAccount(
    @Query('accountNumber') accountNumber: string,
    @Query('bankCode') bankCode: string,
  ) {
    return this.bankAccountsService.resolveAccount(accountNumber, bankCode);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bank account' })
  async deleteBankAccount(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bankAccountsService.deleteBankAccount(id, req.user.userId);
  }
}
