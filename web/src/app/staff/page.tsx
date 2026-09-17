'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Order } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { formatCurrency, formatOrderStatus } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';

const NEXT_STATUS: Record<string, string> = {
  PLACED: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY_FOR_PICKUP',
  READY_FOR_PICKUP: 'COMPLETED',
};

export default function StaffDashboard() {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['staff-orders'],
    queryFn: () => api.orders.list(),
    refetchInterval: 5000,
    enabled: user?.role === 'STAFF' || user?.role === 'ADMIN',
  });

  const { data: menuData } = useQuery({
    queryKey: ['menu-all'],
    queryFn: () => api.menu.items({ available: 'false' }),
    enabled: user?.role === 'STAFF' || user?.role === 'ADMIN',
  });

  const activeOrders = data?.orders.filter(
    (o) => !['COMPLETED', 'CANCELLED'].includes(o.status)
  );

  const updateStatus = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await api.orders.updateStatus(order.id, next);
      toast(`Order moved to ${formatOrderStatus(next)}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  const rejectOrder = async (order: Order) => {
    const reason = prompt('Rejection reason (e.g. item sold out):');
    if (!reason) return;
    try {
      await api.orders.reject(order.id, reason);
      toast('Order rejected', 'success');
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Reject failed', 'error');
    }
  };

  const toggleAvailability = async (id: string, available: boolean) => {
    try {
      await api.menu.updateItem(id, { available: !available });
      toast('Menu item updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['menu-all'] });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  if (!user || (user.role !== 'STAFF' && user.role !== 'ADMIN')) {
    return (
      <div className="py-16 text-center">
        <p>Staff access required</p>
        <Link href="/login" className="text-orange-600 hover:underline">Login</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff Dashboard</h1>
        <button onClick={() => refetch()} className="text-sm text-orange-600">Refresh</button>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Active Orders ({activeOrders?.length || 0})</h2>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-xl bg-orange-50" />
        ) : activeOrders?.length === 0 ? (
          <p className="text-slate-500">No active orders</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {activeOrders?.map((order) => (
              <div key={order.id} className="rounded-xl border border-orange-100 bg-white p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">#{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-slate-500">{order.user?.fullName}</p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                    {formatOrderStatus(order.status)}
                  </span>
                </div>
                <ul className="my-2 text-sm text-slate-600">
                  {order.items.map((i) => (
                    <li key={i.id}>{i.itemName || i.menuItem?.name} × {i.quantity}</li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-orange-600">{formatCurrency(Number(order.totalAmount))}</span>
                  <div className="flex gap-2">
                    {order.status === 'PLACED' && (
                      <button
                        onClick={() => rejectOrder(order)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    )}
                    {NEXT_STATUS[order.status] && (
                      <button
                        onClick={() => updateStatus(order)}
                        className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700"
                      >
                        → {formatOrderStatus(NEXT_STATUS[order.status])}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Menu Management</h2>
        <div className="space-y-2">
          {menuData?.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-slate-500">{formatCurrency(Number(item.price))}</p>
                </div>
              </div>
              <button
                onClick={() => toggleAvailability(item.id, item.available)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  item.available
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {item.available ? 'Available' : 'Sold Out'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
