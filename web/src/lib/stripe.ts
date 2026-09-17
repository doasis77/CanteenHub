import Stripe from 'stripe';

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('...')) return null;
  return new Stripe(key);
}

export function isStripeConfigured() {
  const key = process.env.STRIPE_SECRET_KEY;
  const pub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return !!(key && pub && !key.includes('...') && !pub.includes('...'));
}
