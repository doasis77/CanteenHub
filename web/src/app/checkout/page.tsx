'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useCartStore } from '@/store/cart-store';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const summary = useCartStore((s) => s.summary);
  const syncFromServer = useCartStore((s) => s.syncFromServer);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [notes, setNotes] = useState('');
  const [pickupType, setPickupType] = useState<'ASAP' | 'SCHEDULED'>('ASAP');
  const [scheduledPickup, setScheduledPickup] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'pickup'>('online');
  const [loading, setLoading] = useState(false);

  const { data: loyalty } = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => api.loyalty.get(),
  });

  const discount = loyalty
    ? Math.floor(pointsToRedeem / (loyalty.config.redeemPointsPerUnit as number)) *
      ((loyalty.config.redeemValueCents as number) / 100)
    : 0;

  const subtotal = summary ? parseFloat(summary.subtotal) : 0;
  const tax = summary ? parseFloat(summary.tax) : 0;
  const total = Math.max(0, subtotal + tax - discount);

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const { order } = await api.orders.create({
        pointsToRedeem,
        notes,
        paymentMethod,
        pickupType,
        scheduledPickup: pickupType === 'SCHEDULED' ? scheduledPickup : undefined,
      });
      await syncFromServer();

      if (paymentMethod === 'online') {
        try {
          const { url } = await api.payments.checkout(order.id);
          window.location.href = url;
          return;
        } catch {
          toast('Order placed. Stripe not configured — pay at pickup or add keys to .env', 'success');
        }
      } else {
        toast('Order placed successfully!', 'success');
      }

      router.push(`/orders/${order.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Order failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>

      <div className="space-y-4">
        {loyalty && loyalty.balance > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <label className="mb-2 block text-sm font-medium text-amber-800">
              Redeem Points ({loyalty.balance} available · worth {formatCurrency(loyalty.redeemableValue)})
            </label>
            <input
              type="range"
              min={0}
              max={loyalty.balance}
              step={100}
              value={pointsToRedeem}
              onChange={(e) => setPointsToRedeem(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-sm text-amber-700">
              Using {pointsToRedeem} pts → {formatCurrency(discount)} off
            </p>
          </div>
        )}

        <div className="rounded-xl border border-orange-100 bg-white p-4">
          <p className="mb-2 text-sm font-medium">Pickup Time</p>
          <div className="flex gap-2">
            {(['ASAP', 'SCHEDULED'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPickupType(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                  pickupType === t ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700'
                }`}
              >
                {t === 'ASAP' ? 'ASAP' : 'Schedule'}
              </button>
            ))}
          </div>
          {pickupType === 'SCHEDULED' && (
            <input
              type="datetime-local"
              value={scheduledPickup}
              onChange={(e) => setScheduledPickup(e.target.value)}
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
            />
          )}
        </div>

        <div className="rounded-xl border border-orange-100 bg-white p-4">
          <p className="mb-2 text-sm font-medium">Payment</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('online')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                paymentMethod === 'online' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700'
              }`}
            >
              💳 Pay Online
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('pickup')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                paymentMethod === 'pickup' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700'
              }`}
            >
              🏪 Pay at Pickup
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Order Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm"
            placeholder="Any special instructions..."
          />
        </div>

        <div className="rounded-xl border border-orange-100 bg-white p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(tax)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Points discount</span><span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>Total</span><span className="text-orange-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={loading || !summary?.itemCount}
          className="w-full rounded-xl bg-orange-600 py-3.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? 'Placing Order...' : paymentMethod === 'pickup' ? 'Place Order' : `Pay ${formatCurrency(total)}`}
        </button>
      </div>
    </div>
  );
}
