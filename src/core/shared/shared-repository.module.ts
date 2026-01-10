import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entity/user.entity';
import { Business } from '../businesses/business.entity';
import { OrderItem } from '../order/entity/order-items.entity';
import { Order } from '../order/entity/order.entity';
import { OrderPayment } from '../order/entity/order-payment.entity';
import { OrderRefund } from '../order/entity/order-refund.entity';
import { OrderStatusHistory } from '../order/entity/order-status-history.entity';
import { OrderShipment } from '../order/entity/order-shipment.entity';
import { Product } from '../product/entity/product.entity';
import { Transaction } from '../transaction/entity/transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { BusinessPaymentAccount } from '../businesses/entities/business-payment-account.entity';
import { Settlement } from '../settlements/entities/settlement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Business,
      Transaction,
      Order,
      OrderItem,
      OrderPayment,
      OrderRefund,
      OrderStatusHistory,
      OrderShipment,
      Product,
      Wallet,
      BusinessPaymentAccount,
      Settlement,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class SharedRepositoryModule { }
