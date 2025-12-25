export enum InventoryAdjustmentType {
  SALE = 'sale',
  RETURN = 'return',
  RESTOCK = 'restock',
  ADJUSTMENT = 'adjustment',
  DAMAGED = 'damaged',
  LOST = 'lost',
  RESERVATION = 'reservation',
  RELEASE = 'release',
}

export enum ReservationStatus {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  RELEASED = 'released',
  EXPIRED = 'expired',
}
