'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { OrderTracker } from '@/components/orders/order-tracker';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { Star } from 'lucide-react';

function PaymentConfirmHandler({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const paid = searchParams.get('paid');
    const sessionId = searchParams.get('session_id');
    if (paid === '1' && sessionId) {
      api.payments
        .confirm(sessionId)
        .then(() => {
          toast('Payment confirmed!', 'success');
          queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        })
        .catch(() => toast('Payment confirmation failed', 'error'));
    }
  }, [searchParams, orderId, toast, queryClient]);

  return null;
}

function OrderReviewForm({ orderId, onSubmitted }: { orderId: string; onSubmitted: () => void }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    setLoading(true);
    try {
      await api.orders.review(orderId, rating, review || undefined);
      toast('Thanks for your review!', 'success');
      onSubmitted();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Review failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="mb-3 font-semibold">Rate your order</h2>
      <div className="mb-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star
              className={`h-7 w-7 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        rows={2}
        placeholder="Tell us about your experience (optional)"
        className="mb-3 w-full rounded-lg border border-amber-200 bg-white p-3 text-sm"
      />
      <button
        onClick={submit}
        disabled={loading}
        className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.orders.get(id),
    refetchInterval: 5000,
  });

  const handleCancel = async () => {
    try {
      await api.orders.cancel(id);
      toast('Order cancelled', 'success');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Cancel failed', 'error');
    }
  };

  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-orange-50" />;
  if (!data) return <p>Order not found</p>;

  const { order, canCancel } = data;
  const showReview = order.status === 'COMPLETED' && !order.rating;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Suspense fallback={null}>
        <PaymentConfirmHandler orderId={id} />
      </Suspense>

      <div>
        <button onClick={() => router.back()} className="mb-2 text-sm text-orange-600 hover:underline">
          ← Back to orders
        </button>
        <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
        <p className="text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
      </div>

      <OrderTracker status={order.status} estimatedTime={order.estimatedTime} />

      <div className="rounded-xl border border-orange-100 bg-white p-4">
        <h2 className="mb-3 font-semibold">Items</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between border-b border-slate-50 py-2 text-sm last:border-0">
            <span>{item.itemName || item.menuItem?.name} × {item.quantity}</span>
            <span>{formatCurrency(Number(item.totalPrice))}</span>
          </div>
        ))}
        <div className="mt-3 flex justify-between border-t pt-3 font-bold">
          <span>Total</span>
          <span className="text-orange-600">{formatCurrency(Number(order.totalAmount))}</span>
        </div>
      </div>

      {order.rating && (
        <div className="rounded-xl border border-orange-100 bg-white p-4">
          <h2 className="mb-2 font-semibold">Your Review</h2>
          <div className="mb-1 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-5 w-5 ${n <= order.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
              />
            ))}
          </div>
          {order.review && <p className="text-sm text-slate-600">{order.review}</p>}
        </div>
      )}

      {showReview && (
        <OrderReviewForm
          orderId={id}
          onSubmitted={() => queryClient.invalidateQueries({ queryKey: ['order', id] })}
        />
      )}

      {canCancel && (
        <button
          onClick={handleCancel}
          className="w-full rounded-xl border border-red-200 py-3 text-red-600 hover:bg-red-50"
        >
          Cancel Order
        </button>
      )}
    </div>
  );
}
