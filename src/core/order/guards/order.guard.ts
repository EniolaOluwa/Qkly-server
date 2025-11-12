import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrderAction, ORDER_ACTION_KEY } from '../../../common/decorators/order.decorator';
import { UserRole } from '../../users';
import { OrderService } from '../order.service';

@Injectable()
export class OrderAuthorizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private orderService: OrderService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.get<OrderAction>(
      ORDER_ACTION_KEY,
      context.getHandler(),
    );

    if (!action) {
      return true; // No specific authorization required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orderId = parseInt(request.params.id || request.params.orderId);

    if (!user || !orderId) {
      throw new ForbiddenException('Invalid request');
    }

    // Admin can do everything
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Get the order
    const order = await this.orderService.findOrderById(orderId);

    // Authorization rules for merchants
    switch (action) {
      case OrderAction.VIEW:
        // Merchant can view if they own the business OR if they created the order
        return order.business.userId === user.userId || order.userId === user.userId;

      case OrderAction.UPDATE_STATUS:
      case OrderAction.UPDATE_ITEM_STATUS:
        // Only business owner can update order status
        return order.business.userId === user.userId;

      case OrderAction.DELETE:
        // Only the customer who created the order can delete (cancel) it
        // Business owners cannot delete orders
        return order.userId === user.userId;

      case OrderAction.PROCESS_PAYMENT:
        // Only the customer who created the order can process payment
        return order.userId === user.userId;

      case OrderAction.VIEW_SETTLEMENT:
        // Only business owner can view settlement details
        return order.business.userId === user.userId;

      default:
        return false;
    }
  }
}
