import { LoyaltyConfig } from '@prisma/client';
import { DEFAULT_LOYALTY } from './constants';
import { prisma } from './prisma';

export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  let config = await prisma.loyaltyConfig.findFirst();
  if (!config) {
    config = await prisma.loyaltyConfig.create({
      data: DEFAULT_LOYALTY,
    });
  }
  return config;
}

export function getTierMultiplier(tier: string, config: LoyaltyConfig) {
  switch (tier.toUpperCase()) {
    case 'GOLD':
      return Number(config.goldMultiplier);
    case 'SILVER':
      return Number(config.silverMultiplier);
    default:
      return Number(config.bronzeMultiplier);
  }
}

export function calculateTier(lifetimePoints: number, config: LoyaltyConfig) {
  if (lifetimePoints >= config.goldThreshold) return 'GOLD';
  if (lifetimePoints >= config.silverThreshold) return 'SILVER';
  return 'BRONZE';
}

export function pointsToDiscount(points: number, config: LoyaltyConfig) {
  const units = Math.floor(points / config.redeemPointsPerUnit);
  return (units * config.redeemValueCents) / 100;
}

export function discountToPoints(discountDollars: number, config: LoyaltyConfig) {
  const units = Math.floor((discountDollars * 100) / config.redeemValueCents);
  return units * config.redeemPointsPerUnit;
}
