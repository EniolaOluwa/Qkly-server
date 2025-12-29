export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FREE_SHIPPING = 'free_shipping',
  BUY_X_GET_Y = 'buy_x_get_y',
}

export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  DEPLETED = 'depleted',
}

export enum CouponConstraintType {
  MIN_PURCHASE = 'min_purchase',
  MAX_DISCOUNT = 'max_discount',
  PRODUCT_SPECIFIC = 'product_specific',
  CATEGORY_SPECIFIC = 'category_specific',
  FIRST_ORDER_ONLY = 'first_order_only',
}
