export type UserRole = 'STUDENT' | 'STAFF' | 'ADMIN';

export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED';

export type LoyaltyTransactionType = 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'BONUS';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export type NotificationType = 'ORDER_UPDATE' | 'LOYALTY' | 'PROMOTION' | 'SYSTEM';

export function asUserRole(role: string): UserRole {
  return role as UserRole;
}
