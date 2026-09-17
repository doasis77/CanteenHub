import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { requireRoles, Permissions } from '@/lib/rbac';
import { rejectOrderSchema } from '@/lib/validations';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRoles(req, Permissions.staff);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = rejectOrderSchema.safeParse(body);
    if (!parsed.success) return error('Validation error', 400, parsed.error.flatten());

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return error('Order not found', 404);
    if (order.status !== 'PLACED') {
      return error('Only new orders can be rejected', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', rejectionReason: parsed.data.reason },
      });
      await tx.notification.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          type: 'ORDER_UPDATE',
          title: 'Order rejected',
          message: `Your order was rejected: ${parsed.data.reason}`,
        },
      });
    });

    return success({ rejected: true });
  } catch (e) {
    console.error('Reject order error:', e);
    return error('Failed to reject order', 500);
  }
}
