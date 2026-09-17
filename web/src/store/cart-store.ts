'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, CartItem, CartSummary, MenuItem } from '@/lib/api-client';

interface LocalCartItem {
  menuItemId: string;
  name: string;
  price: number;
  emoji?: string;
  quantity: number;
}

interface CartState {
  localItems: LocalCartItem[];
  serverItems: CartItem[];
  summary: CartSummary | null;
  isGuest: boolean;
  addLocal: (item: MenuItem) => void;
  removeLocal: (menuItemId: string) => void;
  updateLocalQty: (menuItemId: string, quantity: number) => void;
  syncFromServer: () => Promise<void>;
  addToServer: (menuItemId: string, quantity?: number) => Promise<void>;
  clearLocal: () => void;
  localSummary: () => { subtotal: number; tax: number; total: number; itemCount: number };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      localItems: [],
      serverItems: [],
      summary: null,
      isGuest: true,

      localSummary: () => {
        const items = get().localItems;
        const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
        const tax = subtotal * 0.08;
        return { subtotal, tax, total: subtotal + tax, itemCount: items.reduce((s, i) => s + i.quantity, 0) };
      },

      addLocal: (item) => {
        const items = get().localItems;
        const existing = items.find((i) => i.menuItemId === item.id);
        if (existing) {
          set({
            localItems: items.map((i) =>
              i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          });
        } else {
          set({
            localItems: [
              ...items,
              {
                menuItemId: item.id,
                name: item.name,
                price: Number(item.price),
                emoji: item.emoji,
                quantity: 1,
              },
            ],
          });
        }
      },

      removeLocal: (menuItemId) => {
        set({ localItems: get().localItems.filter((i) => i.menuItemId !== menuItemId) });
      },

      updateLocalQty: (menuItemId, quantity) => {
        if (quantity < 1) {
          get().removeLocal(menuItemId);
          return;
        }
        set({
          localItems: get().localItems.map((i) =>
            i.menuItemId === menuItemId ? { ...i, quantity } : i
          ),
        });
      },

      clearLocal: () => set({ localItems: [] }),

      syncFromServer: async () => {
        try {
          const data = await api.cart.get();
          set({ serverItems: data.items, summary: data.summary, isGuest: false });
        } catch {
          set({ isGuest: true });
        }
      },

      addToServer: async (menuItemId, quantity = 1) => {
        await api.cart.add({ menuItemId, quantity });
        await get().syncFromServer();
      },
    }),
    { name: 'canteen-cart', partialize: (s) => ({ localItems: s.localItems }) }
  )
);
