'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatCurrency, formatOrderStatus } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

export default function OrdersPage() {
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.orders.list(),
    refetchInterval: 15000,
  });

  const handleReorder = async (id: string) => {
    try {
      await api.orders.reorder(id);
      toast('Items added to cart', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Reorder failed', 'error');
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-24 animate-pulse rounded-xl bg-orange-50" />
    ))}</div>;
  }

  if (!data?.orders.length) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-4xl">📦</p>
        <h1 className="text-xl font-semibold">No orders yet</h1>
        <Link href="/menu" className="mt-4 inline-block text-orange-600 hover:underline">Start ordering</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order History</h1>
        <button onClick={() => refetch()} className="text-sm text-orange-600 hover:underline">Refresh</button>
      </div>

      <div className="space-y-3">
        {data.orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-orange-100 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                <p className="text-sm text-slate-500">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                {formatOrderStatus(order.status)}
              </span>
            </div>
            <p className="mt-2 font-semibold text-orange-600">{formatCurrency(Number(order.totalAmount))}</p>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/orders/${order.id}`}
                className="rounded-lg border border-orange-200 px-3 py-1.5 text-sm hover:bg-orange-50"
              >
                Track
              </Link>
              {order.status === 'COMPLETED' && (
                <button
                  onClick={() => handleReorder(order.id)}
                  className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700"
                >
                  Reorder
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
