import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { Category } from '../category/entity/category.entity';
import { Order } from '../order/entity/order.entity';
import { OrderModule } from '../order/order.module';
import { Product } from '../product/entity/product.entity';
import { User } from '../users';
import { WalletsModule } from '../wallets/wallets.module';
import { AdminService } from './admin.service';
import { PaymentModule } from '../payment/payment.module';
import { UsersModule } from '../users/users.module';
import { UserProgressModule } from '../user-progress/user-progress.module';
import { TrafficModule } from '../traffic-events/traffic.module';
import { Transaction } from '../transaction/entity/transaction.entity';
import { CategoryModule } from '../category/category.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { RolesModule } from '../roles/roles.module';
import { Role } from '../roles/entities/role.entity';
import { AdminActionsController } from './admin-actions.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminMerchantsController } from './admin-merchants.controller';
import { AdminTrafficController } from './admin-traffic.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminOrderController } from './admin-order.controller';
import { AdminProductsController } from './admin-products.controller';
import { OrderItem } from '../order/entity/order-items.entity';
import { AdminTransactionsController } from './admin-transactions.controller';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Business, Product, Category, User, Transaction, Role]),
    OrderModule,
    WalletsModule,
    PaymentModule,
    UsersModule,
    UserProgressModule,
    TrafficModule,
    CategoryModule,
    BusinessesModule,
    RolesModule,
    TransactionModule
  ],
  controllers: [
    AdminUsersController,
    AdminActionsController,
    AdminDashboardController,
    AdminMerchantsController,
    AdminCategoriesController,
    AdminTrafficController,
    AdminOrderController,
    AdminProductsController,
    AdminTransactionsController
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule { }
