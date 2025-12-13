import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Business } from "../businesses/business.entity";
import { Category } from "../category/entity/category.entity";
import { Order } from "../order/entity/order.entity";
import { Product } from "../product/entity/product.entity";
import { Transaction } from "../transaction/entity/transaction.entity";
import { DashboardStatsDto } from "./dto/dashboard-stats.dto";



@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) { }

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const [totalOrders, totalMerchants, totalProducts, totalCategories, totalTransactions] =
      await Promise.all([
        this.orderRepository.count(),
        this.businessRepository.count(),
        this.productRepository.count(),
        this.categoryRepository.count(),
        this.transactionRepository.count(),
      ]);

    return {
      totalOrders,
      totalMerchants,
      totalProducts,
      totalCategories,
      totalTransactions,
    };
  }
}

