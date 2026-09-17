import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return error('Unauthorized', 401);

  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return error('Order not found', 404);
    if (order.userId !== user.id) return error('Forbidden', 403);

    if (!['PLACED', 'CONFIRMED'].includes(order.status)) {
      return error('Order cannot be cancelled at this stage', 400);
    }

    if (order.cancelDeadline && new Date() > order.cancelDeadline) {
      return error('Cancellation window has expired', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      if (order.pointsRedeemed > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { loyaltyPoints: { increment: order.pointsRedeemed } },
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId: user.id,
            orderId: order.id,
            pointsEarned: order.pointsRedeemed,
            transactionType: 'BONUS',
            description: 'Points refunded due to order cancellation',
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: user.id,
          orderId: order.id,
          type: 'ORDER_UPDATE',
          title: 'Order cancelled',
          message: `Your order #${order.id.slice(0, 8)} has been cancelled.`,
        },
      });
    });

    return success({ cancelled: true });
  } catch (e) {
    console.error('Cancel order error:', e);
    return error('Failed to cancel order', 500);
  }
}
