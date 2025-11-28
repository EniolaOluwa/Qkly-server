import { SetMetadata } from '@nestjs/common';

export enum OrderAction {
  CREATE = 'create',
  VIEW = 'view',
  UPDATE_STATUS = 'update_status',
  UPDATE_ITEM_STATUS = 'update_item_status',
  DELETE = 'delete',
  PROCESS_PAYMENT = 'process_payment',
  VIEW_SETTLEMENT = 'view_settlement',
}

export const ORDER_ACTION_KEY = 'order_action';
export const OrderAuthorization = (action: OrderAction) => SetMetadata(ORDER_ACTION_KEY, action);
