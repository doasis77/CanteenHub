import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser, requireRole } from '@/lib/auth';
import { menuItemSchema, staffMenuUpdateSchema } from '@/lib/validations';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: true, options: true },
    });
    if (!item) return error('Menu item not found', 404);
    return success({ item });
  } catch (e) {
    console.error('Menu item error:', e);
    return error('Failed to fetch menu item', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user || !requireRole(user.role, ['STAFF', 'ADMIN'])) {
    return error('Forbidden', 403);
  }

  try {
    const body = await req.json();
    const isAdmin = requireRole(user.role, ['ADMIN']);
    const parsed = isAdmin
      ? menuItemSchema.partial().safeParse(body)
      : staffMenuUpdateSchema.safeParse(body);
    if (!parsed.success) return error('Validation error', 400, parsed.error.flatten());

    const item = await prisma.menuItem.update({
      where: { id },
      data: parsed.data as Record<string, unknown>,
      include: { category: true },
    });
    return success({ item });
  } catch (e) {
    console.error('Update menu item error:', e);
    return error('Failed to update menu item', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user || !requireRole(user.role, ['ADMIN'])) {
    return error('Forbidden', 403);
  }

  try {
    await prisma.menuItem.delete({ where: { id } });
    return success({ deleted: true });
  } catch (e) {
    console.error('Delete menu item error:', e);
    return error('Failed to delete menu item', 500);
  }
}
