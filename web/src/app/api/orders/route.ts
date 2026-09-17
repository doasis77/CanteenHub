import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { requireRole } from '@/lib/auth';
import { requireAuth, requireRoles, Permissions } from '@/lib/rbac';
import { createOrderSchema } from '@/lib/validations';
import { getLoyaltyConfig, getTierMultiplier, calculateTier, discountToPoints } from '@/lib/loyalty';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const isStaff = requireRole(user.role, Permissions.staff);
    const status = req.nextUrl.searchParams.get('status');

    const orders = await prisma.order.findMany({
      where: {
        ...(isStaff ? {} : { userId: user.id }),
        ...(status ? { status } : {}),
      },
      include: {
        items: { include: { menuItem: true } },
        user: { select: { fullName: true, studentId: true } },
      },
      orderBy: isStaff
        ? [{ estimatedTime: 'asc' }, { createdAt: 'asc' }]
        : [{ createdAt: 'desc' }],
      take: 50,
    });

    return success({ orders });
  } catch (e) {
    console.error('Orders GET error:', e);
    return error('Failed to fetch orders', 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, Permissions.student);
  if (auth.error) return auth.error;
  const user = auth.user!;

  const ip = getClientIp(req);
  if (!rateLimit(`order:${user.id}:${ip}`, 10, 10 * 60 * 1000)) {
    return error('Too many orders, please wait', 429);
  }

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) return error('Validation error', 400, parsed.error.flatten());

    const {
      pointsToRedeem = 0,
      notes,
      paymentMethod = 'online',
      pickupType = 'ASAP',
      scheduledPickup,
    } = parsed.data;
    const config = await getLoyaltyConfig();

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: { menuItem: true },
    });

    if (cartItems.length === 0) return error('Cart is empty', 400);

    const unavailable = cartItems.filter((i) => !i.menuItem.available);
    if (unavailable.length > 0) {
      return error('Some items are no longer available', 400);
    }

    const outOfStock = cartItems.filter(
      (i) => i.menuItem.stockQuantity != null && i.menuItem.stockQuantity < i.quantity
    );
    if (outOfStock.length > 0) {
      return error('Some items have insufficient stock', 400);
    }

    const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);
    if (itemCount > config.maxOrderItems) {
      return error(`Maximum ${config.maxOrderItems} items per order`, 400);
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.menuItem.price) * item.quantity,
      0
    );
    const taxAmount = subtotal * Number(config.taxRate);

    if (pointsToRedeem > user.loyaltyPoints) {
      return error('Insufficient loyalty points', 400);
    }

    const maxRedeemablePoints = discountToPoints(subtotal + taxAmount, config);
    const actualPointsRedeem = Math.min(pointsToRedeem, maxRedeemablePoints);
    const discountAmount = (Math.floor(actualPointsRedeem / config.redeemPointsPerUnit) * config.redeemValueCents) / 100;
    const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

    if (totalAmount > Number(config.maxCartValue)) {
      return error(`Order exceeds maximum cart value of $${config.maxCartValue}`, 400);
    }

    const maxPrep = Math.max(...cartItems.map((i) => i.menuItem.prepTimeMinutes));
    const baseTime =
      pickupType === 'SCHEDULED' && scheduledPickup
        ? new Date(scheduledPickup).getTime()
        : Date.now();
    const estimatedTime = new Date(baseTime + maxPrep * 60 * 1000);
    const payStatus = paymentMethod === 'pickup' ? 'PENDING' : paymentMethod === 'mock' ? 'COMPLETED' : 'PENDING';
    const cancelDeadline = new Date(Date.now() + config.cancelWindowMinutes * 60 * 1000);

    const multiplier = getTierMultiplier(user.loyaltyTier, config);
    const pointsEarned = Math.floor(Number(totalAmount) * config.pointsPerDollar * multiplier);

    const earnedTxs = await prisma.loyaltyTransaction.findMany({
      where: { userId: user.id },
      select: { pointsEarned: true, transactionType: true },
    });
    const lifetimeBefore = earnedTxs
      .filter((t) => t.transactionType === 'EARNED')
      .reduce((sum, t) => sum + t.pointsEarned, 0);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: user.id,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          pointsRedeemed: actualPointsRedeem,
          status: 'PLACED',
          estimatedTime,
          cancelDeadline,
          notes,
          pickupType,
          scheduledPickup: scheduledPickup ? new Date(scheduledPickup) : null,
          paymentMethod,
          items: {
            create: cartItems.map((item) => ({
              menuItemId: item.menuItemId,
              itemName: item.menuItem.name,
              quantity: item.quantity,
              unitPrice: item.menuItem.price,
              totalPrice: Number(item.menuItem.price) * item.quantity,
              customizations: item.customizations ?? undefined,
            })),
          },
        },
        include: { items: true },
      });

      await tx.paymentRecord.create({
        data: {
          orderId: created.id,
          userId: user.id,
          amount: totalAmount,
          status: payStatus,
          paymentMethod,
        },
      });

      await Promise.all(
        cartItems
          .filter((item) => item.menuItem.stockQuantity != null)
          .map((item) =>
            tx.menuItem.update({
              where: { id: item.menuItemId },
              data: {
                stockQuantity: { decrement: item.quantity },
                available: item.menuItem.stockQuantity! - item.quantity > 0,
              },
            })
          )
      );

      if (actualPointsRedeem > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { loyaltyPoints: { decrement: actualPointsRedeem } },
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId: user.id,
            orderId: created.id,
            pointsRedeemed: actualPointsRedeem,
            transactionType: 'REDEEMED',
            description: `Redeemed ${actualPointsRedeem} points on order`,
          },
        });
      }

      if (pointsEarned > 0) {
        const newTier = calculateTier(lifetimeBefore + pointsEarned, config);
        await tx.user.update({
          where: { id: user.id },
          data: {
            loyaltyPoints: { increment: pointsEarned },
            ...(newTier !== user.loyaltyTier ? { loyaltyTier: newTier } : {}),
          },
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId: user.id,
            orderId: created.id,
            pointsEarned,
            transactionType: 'EARNED',
            description: `Earned ${pointsEarned} points (${user.loyaltyTier} tier)`,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: user.id,
          orderId: created.id,
          type: 'ORDER_UPDATE',
          title: 'Order placed',
          message: `Your order #${created.id.slice(0, 8)} has been placed successfully.`,
        },
      });

      await tx.cartItem.deleteMany({ where: { userId: user.id } });

      return created;
    }, { timeout: 30000, maxWait: 10000 });

    return success({ order }, 201);
  } catch (e) {
    console.error('Create order error:', e);
    return error('Failed to create order', 500);
  }
}
