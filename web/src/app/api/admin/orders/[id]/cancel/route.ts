import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { requireRoles, Permissions } from '@/lib/rbac';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRoles(req, Permissions.admin);
  if (auth.error) return auth.error;

  try {
    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) return error('Order not found', 404);
    if (order.status === 'COMPLETED') return error('Cannot cancel completed order', 400);

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: params.id },
        data: { status: 'CANCELLED' },
      });
      await tx.paymentRecord.updateMany({
        where: { orderId: params.id },
        data: { status: 'REFUNDED' },
      });
      if (order.pointsRedeemed > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: { loyaltyPoints: { increment: order.pointsRedeemed } },
        });
      }
      await tx.notification.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          type: 'ORDER_UPDATE',
          title: 'Order cancelled by admin',
          message: 'Your order was cancelled and any payment will be refunded.',
        },
      });
    });

    return success({ cancelled: true });
  } catch (e) {
    console.error('Admin cancel error:', e);
    return error('Failed to cancel order', 500);
  }
}
