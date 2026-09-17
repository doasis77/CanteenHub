import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser } from '@/lib/auth';
import { getLoyaltyConfig, pointsToDiscount } from '@/lib/loyalty';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return error('Unauthorized', 401);

  try {
    const config = await getLoyaltyConfig();
    const transactions = await prisma.loyaltyTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { order: { select: { id: true, totalAmount: true } } },
    });

    const lifetimeEarned = transactions
      .filter((t) => t.transactionType === 'EARNED')
      .reduce((sum, t) => sum + t.pointsEarned, 0);

    return success({
      balance: user.loyaltyPoints,
      tier: user.loyaltyTier,
      lifetimeEarned,
      redeemableValue: pointsToDiscount(user.loyaltyPoints, config),
      config: {
        pointsPerDollar: config.pointsPerDollar,
        redeemPointsPerUnit: config.redeemPointsPerUnit,
        redeemValueCents: config.redeemValueCents,
        tiers: {
          BRONZE: { multiplier: Number(config.bronzeMultiplier), threshold: 0 },
          SILVER: { multiplier: Number(config.silverMultiplier), threshold: config.silverThreshold },
          GOLD: { multiplier: Number(config.goldMultiplier), threshold: config.goldThreshold },
        },
      },
      transactions,
    });
  } catch (e) {
    console.error('Loyalty error:', e);
    return error('Failed to fetch loyalty data', 500);
  }
}
