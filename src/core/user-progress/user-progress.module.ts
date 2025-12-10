import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { Product } from '../product/entity/product.entity';
import { User } from '../users/entity/user.entity';
import { UserProgress } from './entities/user-progress.entity';

import { UsersModule } from '../users/users.module';
import { ProgressBackfillService } from './progress-backfill.script';
import { UserProgressEvaluator } from './user-progress-evaluator';
import { UserProgressController } from './user-progress.controller';
import { UserProgressService } from './user-progress.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserProgress, User, Business, Product]),
    // If you have a UsersModule with providers used elsewhere, you can forwardRef it:
    forwardRef(() => UsersModule),
  ],
  controllers: [UserProgressController],
  providers: [UserProgressService, UserProgressEvaluator, ProgressBackfillService],
  exports: [UserProgressService, UserProgressEvaluator, ProgressBackfillService],
})
export class UserProgressModule { }
