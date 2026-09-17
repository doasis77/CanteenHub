import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { requireRoles, Permissions } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, Permissions.admin);
  if (auth.error) return auth.error;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        studentId: true,
        role: true,
        loyaltyPoints: true,
        loyaltyTier: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return success({ users });
  } catch (e) {
    console.error('Admin users error:', e);
    return error('Failed to fetch users', 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRoles(req, Permissions.admin);
  if (auth.error) return auth.error;

  try {
    const { userId, role, loyaltyPoints, isActive } = await req.json();
    if (!userId) return error('userId required', 400);
    if (role === 'ADMIN' && userId === auth.user!.id && isActive === false) {
      return error('Cannot deactivate your own admin account', 400);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role ? { role } : {}),
        ...(loyaltyPoints !== undefined ? { loyaltyPoints } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        loyaltyPoints: true,
        isActive: true,
      },
    });
    return success({ user: updated });
  } catch (e) {
    console.error('Admin update user error:', e);
    return error('Failed to update user', 500);
  }
}
