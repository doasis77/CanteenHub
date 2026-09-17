import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles, Permissions } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, Permissions.admin);
  if (auth.error) return auth.error;

  const format = req.nextUrl.searchParams.get('format') || 'csv';

  const orders = await prisma.order.findMany({
    where: { status: { not: 'CANCELLED' } },
    include: {
      user: { select: { fullName: true, email: true } },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  if (format === 'csv') {
    const header = 'Order ID,Date,Customer,Email,Status,Total,Items\n';
    const rows = orders
      .map((o) => {
        const items = o.items.map((i) => `${i.itemName || 'item'} x${i.quantity}`).join('; ');
        return [
          o.id.slice(0, 8),
          o.createdAt.toISOString(),
          o.user.fullName,
          o.user.email,
          o.status,
          Number(o.totalAmount).toFixed(2),
          `"${items}"`,
        ].join(',');
      })
      .join('\n');

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="canteen-orders-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({ orders });
}
