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

    // 1. Business exists
    const business = await this.businessRepo.findOne({
      where: { userId: user.id },
    });

    if (business) {
      progress.push(UserProgressEvent.BUSINESS_CREATED);

      // 2. Business info updated (if extra fields beyond creation exist)
      if (
        business.storeName ||
        business.heroText ||
        business.businessDescription ||
        business.storeColor ||
        business.coverImage
      ) {
        progress.push(UserProgressEvent.BUSINESS_INFO_UPDATED);
      }

      // 3. Cover image added
      if (business.coverImage) {
        progress.push(UserProgressEvent.COVER_IMAGE_UPDATED);
      }
    }

    // 4. First product created
    const productCount = await this.productRepo.count({
      where: { userId: user.id },
    });

    if (productCount > 0) {
      progress.push(UserProgressEvent.FIRST_PRODUCT_CREATED);
    }

    return progress;
  }
}
