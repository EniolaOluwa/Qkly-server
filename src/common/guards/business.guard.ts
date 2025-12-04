import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../../core/businesses/business.entity';

@Injectable()
export class BusinessGuard implements CanActivate {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId || request.user?.id;

    if (!userId) {
      return false;
    }

    const business = await this.businessRepository.findOne({
      where: { userId }
    });

    if (!business) {
      throw new NotFoundException('User must have a business to access this resource');
    }

    request.user.businessId = business.id;
    return true;
  }
}