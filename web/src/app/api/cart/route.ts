import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser } from '@/lib/auth';
import { getLoyaltyConfig } from '@/lib/loyalty';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return error('Unauthorized', 401);

  try {
    const config = await getLoyaltyConfig();
    const items = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: { menuItem: { include: { category: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.menuItem.price) * item.quantity,
      0
    );
    const tax = subtotal * Number(config.taxRate);
    const total = subtotal + tax;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return success({
      items,
      summary: {
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        itemCount,
        maxItems: config.maxOrderItems,
      },
    });
  } catch (e) {
    console.error('Cart GET error:', e);
    return error('Failed to fetch cart', 500);
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return error('Unauthorized', 401);

  try {
    await prisma.cartItem.deleteMany({ where: { userId: user.id } });
    return success({ cleared: true });
  } catch (e) {
    console.error('Cart clear error:', e);
    return error('Failed to clear cart', 500);
  }
}
