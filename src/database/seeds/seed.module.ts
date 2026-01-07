import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../core/roles/entities/role.entity';
import { User } from '../../core/users';
import { UserSecurity } from '../../core/users/entities/user-security.entity';
import { RolesSeedService } from './roles.seed';

import { Business } from '../../core/businesses/business.entity';
import { BusinessType } from '../../core/businesses/business-type.entity';
import { Category } from '../../core/category/entity/category.entity';
import { Product } from '../../core/product/entity/product.entity';
import { TestDataSeedService } from './test-data.seed';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forFeature([
      Role,
      User,
      Business,
      BusinessType,
      Category,
      Product,
      UserSecurity
    ]),

  ],
  providers: [RolesSeedService, TestDataSeedService],
  exports: [RolesSeedService, TestDataSeedService],
})
export class SeedModule { }

