import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { requireAuth } from '@/lib/rbac';
import { getStripe, isStripeConfigured } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  if (!isStripeConfigured()) {
    return success({ confirmed: true, mock: true });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) return error('sessionId required', 400);

    const stripe = getStripe()!;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return error('Payment not completed', 400);
    }

    const orderId = session.metadata?.orderId;
    if (!orderId || session.metadata?.userId !== auth.user!.id) {
      return error('Invalid session', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentRecord.updateMany({
        where: { orderId },
        data: { status: 'COMPLETED', stripePaymentId: session.payment_intent as string },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED' },
      });
      await tx.notification.create({
        data: {
          userId: auth.user!.id,
          orderId,
          type: 'ORDER_UPDATE',
          title: 'Payment received',
          message: 'Your payment was successful. Order confirmed!',
        },
      });
    });

    return success({ confirmed: true, orderId });
  } catch (e) {
    console.error('Payment confirm error:', e);
    return error('Failed to confirm payment', 500);
  }
}
