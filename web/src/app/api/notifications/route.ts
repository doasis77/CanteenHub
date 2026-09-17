import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return error('Unauthorized', 401);

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const unreadCount = notifications.filter((n) => !n.read).length;
    return success({ notifications, unreadCount });
  } catch {
    return error('Failed to fetch notifications', 500);
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return error('Unauthorized', 401);

  try {
    const { notificationIds, markAllRead } = await req.json();

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
    } else if (notificationIds?.length) {
      await prisma.notification.updateMany({
        where: { id: { in: notificationIds }, userId: user.id },
        data: { read: true },
      });
    }

    return success({ updated: true });
  } catch {
    return error('Failed to update notifications', 500);
  }
}
