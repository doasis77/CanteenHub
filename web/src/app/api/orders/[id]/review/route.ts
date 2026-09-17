import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { requireAuth } from '@/lib/rbac';
import { reviewSchema } from '@/lib/validations';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return error('Validation error', 400, parsed.error.flatten());

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.userId !== auth.user!.id) return error('Order not found', 404);
    if (order.status !== 'COMPLETED') return error('Only completed orders can be reviewed', 400);

    const updated = await prisma.order.update({
      where: { id },
      data: { rating: parsed.data.rating, review: parsed.data.review },
    });

    return success({ order: updated });
  } catch (e) {
    console.error('Review error:', e);
    return error('Failed to submit review', 500);
  }
}
