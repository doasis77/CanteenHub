export const ORDER_STATUS_FLOW = [
  'PLACED',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'COMPLETED',
] as const;

export const DIETARY_TAGS = ['veg', 'vegan', 'spicy', 'gluten-free'] as const;

export const DEFAULT_LOYALTY = {
  pointsPerDollar: 1,
  redeemPointsPerUnit: 100,
  redeemValueCents: 500,
  bronzeMultiplier: 1,
  silverMultiplier: 1.25,
  goldMultiplier: 1.5,
  silverThreshold: 500,
  goldThreshold: 1500,
  cancelWindowMinutes: 5,
  maxOrderItems: 20,
  taxRate: 0.08,
};
