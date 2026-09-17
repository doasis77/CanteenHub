import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser, requireRole } from '@/lib/auth';
import { menuItemSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const dietary = searchParams.get('dietary');
    const maxPrice = searchParams.get('maxPrice');
    const specialsOnly = searchParams.get('specials') === 'true';
    const availableOnly = searchParams.get('available') !== 'false';

    const items = await prisma.menuItem.findMany({
      where: {
        ...(availableOnly ? { available: true } : {}),
        ...(specialsOnly ? { isSpecial: true } : {}),
        ...(category ? { categoryId: category } : {}),
        ...(maxPrice ? { price: { lte: parseFloat(maxPrice) } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(dietary ? { dietaryTags: { has: dietary } } : {}),
      },
      include: {
        category: true,
        options: true,
      },
      orderBy: [{ isSpecial: 'desc' }, { name: 'asc' }],
    });

    const specials = items.filter((i) => i.isSpecial);
    const popular = items.filter((i) => i.isPopular);

    let topPopular = popular;
    if (topPopular.length === 0) {
      const topItems = await prisma.orderItem.groupBy({
        by: ['menuItemId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      });
      const ids = topItems.map((t) => t.menuItemId).filter(Boolean) as string[];
      topPopular = items.filter((i) => ids.includes(i.id));
    }

    return success({ items, specials, popular: topPopular, count: items.length });
  } catch (e) {
    console.error('Menu items error:', e);
    return error('Failed to fetch menu items', 500);
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !requireRole(user.role, ['STAFF', 'ADMIN'])) {
    return error('Forbidden', 403);
  }

  try {
    const body = await req.json();
    const parsed = menuItemSchema.safeParse(body);
    if (!parsed.success) return error('Validation error', 400, parsed.error.flatten());

    const item = await prisma.menuItem.create({
      data: {
        ...parsed.data,
        imageUrl: parsed.data.imageUrl || null,
      },
      include: { category: true },
    });
    return success({ item }, 201);
  } catch (e) {
    console.error('Create menu item error:', e);
    return error('Failed to create menu item', 500);
  }
}
