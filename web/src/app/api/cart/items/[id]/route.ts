import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser } from '@/lib/auth';
import { getLoyaltyConfig } from '@/lib/loyalty';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return error('Unauthorized', 401);

  try {
    const { quantity } = await req.json();
    if (!quantity || quantity < 1) return error('Invalid quantity', 400);

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!cartItem) return error('Cart item not found', 404);

    const config = await getLoyaltyConfig();
    const allItems = await prisma.cartItem.findMany({ where: { userId: user.id } });
    const otherCount = allItems
      .filter((i) => i.id !== params.id)
      .reduce((s, i) => s + i.quantity, 0);

    if (otherCount + quantity > config.maxOrderItems) {
      return error(`Maximum ${config.maxOrderItems} items per order`, 400);
    }

    const item = await prisma.cartItem.update({
      where: { id: params.id },
      data: { quantity },
      include: { menuItem: true },
    });
    return success({ item });
  } catch (e) {
    console.error('Cart update error:', e);
    return error('Failed to update cart item', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return error('Unauthorized', 401);

  try {
    const cartItem = await prisma.cartItem.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!cartItem) return error('Cart item not found', 404);

    await prisma.cartItem.delete({ where: { id: params.id } });
    return success({ deleted: true });
  } catch (e) {
    console.error('Cart delete error:', e);
    return error('Failed to remove cart item', 500);
  }
}
