import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { requireAuth } from '@/lib/rbac';
import { getStripe, isStripeConfigured } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  if (!isStripeConfigured()) {
    return error('Stripe is not configured. Use pay-at-pickup or add STRIPE keys to .env', 503);
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) return error('orderId required', 400);

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: auth.user!.id },
    });
    if (!order) return error('Order not found', 404);
    if (order.paymentMethod === 'pickup') {
      return error('This order uses pay-at-pickup', 400);
    }

    const stripe = getStripe()!;
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Campus Canteen Order #${order.id.slice(0, 8)}` },
            unit_amount: Math.round(Number(order.totalAmount) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { orderId: order.id, userId: auth.user!.id },
      success_url: `${origin}/orders/${order.id}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?cancelled=1`,
    });

    await prisma.paymentRecord.updateMany({
      where: { orderId: order.id },
      data: { stripePaymentId: session.id, status: 'PENDING' },
    });

    return success({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error('Stripe checkout error:', e);
    return error('Failed to create checkout session', 500);
  }
}
