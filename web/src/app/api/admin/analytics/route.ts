import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser, requireRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !requireRole(user.role, ['ADMIN'])) return error('Forbidden', 403);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, todayOrders, totalRevenue, todayRevenue, userCount, topItems] =
      await Promise.all([
        prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
        prisma.order.count({
          where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } },
        }),
        prisma.order.aggregate({
          where: { status: { not: 'CANCELLED' } },
          _sum: { totalAmount: true },
        }),
        prisma.order.aggregate({
          where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } },
          _sum: { totalAmount: true },
        }),
        prisma.user.count(),
        prisma.orderItem.groupBy({
          by: ['menuItemId'],
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
      ]);

    const itemIds = topItems.map((i) => i.menuItemId).filter(Boolean) as string[];
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, name: true, emoji: true },
    });

    const popularItems = topItems.map((t) => ({
      ...menuItems.find((m) => m.id === t.menuItemId),
      quantitySold: t._sum.quantity,
    }));

    const statusBreakdown = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return success({
      analytics: {
        totalOrders,
        todayOrders,
        totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
        todayRevenue: Number(todayRevenue._sum.totalAmount || 0),
        userCount,
        popularItems,
        statusBreakdown,
      },
    });
  } catch (e) {
    console.error('Analytics error:', e);
    return error('Failed to fetch analytics', 500);
  }
}
