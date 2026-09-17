import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';

export async function GET() {
  try {
    const categories = await prisma.menuCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { menuItems: true } } },
    });
    return success({ categories });
  } catch (e) {
    console.error('Categories error:', e);
    return error('Failed to fetch categories', 500);
  }
}
