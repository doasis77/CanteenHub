import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser, requireRole } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return error('Unauthorized', 401);

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true } },
        user: { select: { fullName: true, email: true } },
        paymentRecords: true,
      },
    });

    if (!order) return error('Order not found', 404);
    if (order.userId !== user.id && !requireRole(user.role, ['STAFF', 'ADMIN'])) {
      return error('Forbidden', 403);
    }

    const canCancel =
      ['PLACED', 'CONFIRMED'].includes(order.status) &&
      order.cancelDeadline &&
      new Date() < order.cancelDeadline;

    return success({ order, canCancel });
  } catch (e) {
    console.error('Order GET error:', e);
    return error('Failed to fetch order', 500);
  }
}
