'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { formatCurrency } from '@/lib/utils';
import { Minus, Plus, Trash2 } from 'lucide-react';

export default function CartPage() {
  const user = useAuthStore((s) => s.user);
  const { localItems, serverItems, summary, syncFromServer, updateLocalQty, removeLocal } =
    useCartStore();
  const localSummary = useCartStore((s) => s.localSummary);

  useEffect(() => {
    if (user) syncFromServer();
  }, [user, syncFromServer]);

  const items = user
    ? serverItems.map((i) => ({
        id: i.id,
        menuItemId: i.menuItem.id,
        name: i.menuItem.name,
        emoji: i.menuItem.emoji,
        price: Number(i.menuItem.price),
        quantity: i.quantity,
        isServer: true as const,
      }))
    : localItems.map((i) => ({ ...i, id: i.menuItemId, isServer: false as const }));

  const totals = user && summary
    ? {
        subtotal: parseFloat(summary.subtotal),
        tax: parseFloat(summary.tax),
        total: parseFloat(summary.total),
      }
    : localSummary();

  const updateQty = async (id: string, menuItemId: string, qty: number, isServer: boolean) => {
    if (user && isServer) {
      const { api } = await import('@/lib/api-client');
      if (qty < 1) await api.cart.remove(id);
      else await api.cart.update(id, qty);
      await syncFromServer();
    } else {
      updateLocalQty(menuItemId, qty);
    }
  };

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-4xl">🛒</p>
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <p className="mb-6 text-slate-500">Browse the menu and add some delicious items</p>
        <Link href="/menu" className="rounded-lg bg-orange-600 px-6 py-2.5 text-white hover:bg-orange-700">
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Your Cart</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.menuItemId} className="flex items-center gap-4 rounded-xl border border-orange-100 bg-white p-4">
            <span className="text-3xl">{item.emoji || '🍽️'}</span>
            <div className="flex-1">
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-sm text-orange-600">{formatCurrency(item.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQty(item.id, item.menuItemId, item.quantity - 1, item.isServer)}
                className="rounded-lg border p-1 hover:bg-slate-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQty(item.id, item.menuItemId, item.quantity + 1, item.isServer)}
                className="rounded-lg border p-1 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {!user && (
              <button onClick={() => removeLocal(item.menuItemId)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-orange-100 bg-white p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
          <div className="flex justify-between text-slate-500"><span>Tax</span><span>{formatCurrency(totals.tax)}</span></div>
          <div className="flex justify-between border-t pt-2 text-lg font-bold">
            <span>Total</span><span className="text-orange-600">{formatCurrency(totals.total)}</span>
          </div>
        </div>
        <Link
          href={user ? '/checkout' : '/login'}
          className="mt-4 block w-full rounded-xl bg-orange-600 py-3 text-center font-semibold text-white hover:bg-orange-700"
        >
          {user ? 'Proceed to Checkout' : 'Login to Checkout'}
        </Link>
      </div>
    </div>
  );
}
