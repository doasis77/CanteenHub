import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser, requireRole } from '@/lib/auth';
import { orderStatusSchema } from '@/lib/validations';

const STATUS_MESSAGES: Record<string, string> = {
  CONFIRMED: 'Your order has been confirmed by the canteen.',
  PREPARING: 'Your order is being prepared.',
  READY_FOR_PICKUP: 'Your order is ready for pickup!',
  COMPLETED: 'Your order has been completed. Enjoy!',
  CANCELLED: 'Your order has been cancelled.',
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user || !requireRole(user.role, ['STAFF', 'ADMIN'])) {
    return error('Forbidden', 403);
  }

  try {
    const body = await req.json();
    const parsed = orderStatusSchema.safeParse(body);
    if (!parsed.success) return error('Validation error', 400, parsed.error.flatten());

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) return error('Order not found', 404);

    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: params.id },
        data: { status: parsed.data.status },
        include: { items: true, user: true },
      });

      await tx.notification.create({
        data: {
          userId: o.userId,
          orderId: o.id,
          type: 'ORDER_UPDATE',
          title: `Order ${parsed.data.status.replace(/_/g, ' ').toLowerCase()}`,
          message: STATUS_MESSAGES[parsed.data.status] || 'Order status updated.',
        },
      });

      return o;
    });

    return success({ order: updated });
  } catch (e) {
    console.error('Update status error:', e);
    return error('Failed to update order status', 500);
  }
}
