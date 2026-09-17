'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, MenuItem } from '@/lib/api-client';
import { MenuItemCard } from '@/components/menu/menu-item-card';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useToast } from '@/components/ui/toast';
import { Search } from 'lucide-react';

export default function MenuPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dietary, setDietary] = useState('');
  const user = useAuthStore((s) => s.user);
  const addLocal = useCartStore((s) => s.addLocal);
  const addToServer = useCartStore((s) => s.addToServer);
  const { toast } = useToast();

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.menu.categories(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['menu', search, category, dietary],
    queryFn: () =>
      api.menu.items({
        ...(search ? { search } : {}),
        ...(category ? { category } : {}),
        ...(dietary ? { dietary } : {}),
      }),
  });

  const handleAdd = async (item: MenuItem) => {
    try {
      if (user) {
        await addToServer(item.id);
      } else {
        addLocal(item);
      }
      toast(`${item.name} added to cart`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to add item', 'error');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Campus Menu</h1>
        <p className="text-slate-500">Fresh meals, snacks & beverages</p>
      </div>

      {data?.specials && data.specials.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-orange-700">⭐ Today&apos;s Specials</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.specials.map((item) => (
              <MenuItemCard key={item.id} item={item} onAdd={handleAdd} />
            ))}
          </div>
        </section>
      )}

      {data?.popular && data.popular.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-orange-700">🔥 Most Popular</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.popular.map((item) => (
              <MenuItemCard key={`pop-${item.id}`} item={item} onAdd={handleAdd} />
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          <option value="">All Categories</option>
          {categoriesData?.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={dietary}
          onChange={(e) => setDietary(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          <option value="">All Diets</option>
          <option value="veg">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="spicy">Spicy</option>
          <option value="gluten-free">Gluten-Free</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-orange-50" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
          No items match your filters
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((item) => (
            <MenuItemCard key={item.id} item={item} onAdd={handleAdd} />
          ))}
        </div>
      )}
    </div>
  );
}
