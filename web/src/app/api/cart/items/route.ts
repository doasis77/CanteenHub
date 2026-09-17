import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser } from '@/lib/auth';
import { cartItemSchema } from '@/lib/validations';
import { getLoyaltyConfig } from '@/lib/loyalty';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return error('Unauthorized', 401);

  try {
    const body = await req.json();
    const parsed = cartItemSchema.safeParse(body);
    if (!parsed.success) return error('Validation error', 400, parsed.error.flatten());

    const { menuItemId, quantity, customizations } = parsed.data;
    const config = await getLoyaltyConfig();

    const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem || !menuItem.available) {
      return error('Item unavailable', 400);
    }

    const existingCart = await prisma.cartItem.findMany({ where: { userId: user.id } });
    const currentCount = existingCart.reduce((s, i) => s + i.quantity, 0);
    const existing = existingCart.find((i) => i.menuItemId === menuItemId);
    const newTotal = currentCount - (existing?.quantity || 0) + quantity;

    if (newTotal > config.maxOrderItems) {
      return error(`Maximum ${config.maxOrderItems} items per order`, 400);
    }

    const item = await prisma.cartItem.upsert({
      where: {
        userId_menuItemId: { userId: user.id, menuItemId },
      },
      create: {
        userId: user.id,
        menuItemId,
        quantity,
        customizations: customizations as Prisma.InputJsonValue | undefined,
      },
      update: {
        quantity,
        customizations: customizations as Prisma.InputJsonValue | undefined,
      },
      include: { menuItem: true },
    });

    return success({ item }, 201);
  } catch (e) {
    console.error('Cart add error:', e);
    return error('Failed to add to cart', 500);
  }
}
