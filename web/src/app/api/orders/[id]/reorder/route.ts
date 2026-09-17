import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser } from '@/lib/auth';
import { getLoyaltyConfig } from '@/lib/loyalty';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return error('Unauthorized', 401);

  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: { include: { menuItem: true } } },
    });

    if (!order || order.userId !== user.id) return error('Order not found', 404);

    const config = await getLoyaltyConfig();
    let added = 0;

    for (const item of order.items) {
      if (!item.menuItemId || !item.menuItem?.available) continue;

      await prisma.cartItem.upsert({
        where: {
          userId_menuItemId: { userId: user.id, menuItemId: item.menuItemId },
        },
        create: {
          userId: user.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          customizations: item.customizations ?? undefined,
        },
        update: { quantity: { increment: item.quantity } },
      });
      added += item.quantity;
    }

    const cart = await prisma.cartItem.findMany({ where: { userId: user.id } });
    const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
    if (totalItems > config.maxOrderItems) {
      return error(`Cart exceeds maximum ${config.maxOrderItems} items`, 400);
    }

    return success({ added, message: `${added} items added to cart` });
  } catch (e) {
    console.error('Reorder error:', e);
    return error('Failed to reorder', 500);
  }
}
