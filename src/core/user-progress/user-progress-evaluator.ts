import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Business } from "../businesses/business.entity";
import { Product } from "../product/entity/product.entity";
import { User } from "../users";
import { UserProgressEvent } from "./entities/user-progress.entity";



@Injectable()
export class UserProgressEvaluator {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Business) private businessRepo: Repository<Business>,
  ) { }

  async evaluate(user: User): Promise<UserProgressEvent[]> {
    const progress: UserProgressEvent[] = [];

    // 1. BUSINESS_INFO_UPDATED
    const business = await this.businessRepo.findOne({
      where: { userId: user.id },
    });

    if (business) {
      if (
        business.storeName ||
        business.heroText ||
        business.businessDescription ||
        business.storeColor ||
        business.coverImage
      ) {
        progress.push(UserProgressEvent.BUSINESS_INFO_UPDATED);
      }
    }

    // 2. FIRST_PRODUCT_CREATED
    const productCount = await this.productRepo.count({
      where: { userId: user.id },
    });

    if (productCount > 0) {
      progress.push(UserProgressEvent.FIRST_PRODUCT_CREATED);
    }

    // 3. PIN_CREATED (Backfill friendly)
    const hasPin = !!user.pin;

    if (hasPin) {
      progress.push(UserProgressEvent.TRANSACTION_PIN_CREATED);
    }

    return progress;
  }
}
