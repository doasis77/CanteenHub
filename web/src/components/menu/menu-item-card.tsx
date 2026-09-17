'use client';

import { MenuItem } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Clock, Plus } from 'lucide-react';

interface Props {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAdd }: Props) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-5xl">{item.emoji || '🍽️'}</span>
        )}
        {item.isSpecial && (
          <span className="absolute left-2 top-2 rounded-full bg-orange-600 px-2 py-0.5 text-xs font-semibold text-white">
            Today&apos;s Special
          </span>
        )}
        {!item.available && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white">
            Sold Out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">{item.name}</h3>
          <span className="shrink-0 font-bold text-orange-600">{formatCurrency(Number(item.price))}</span>
        </div>

        {item.description && (
          <p className="mb-2 line-clamp-2 text-sm text-slate-500">{item.description}</p>
        )}

        <div className="mb-3 flex flex-wrap gap-1">
          {item.dietaryTags?.map((tag) => (
            <span key={tag} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
              {tag}
            </span>
          ))}
          {item.allergens?.map((a) => (
            <span key={a} className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
              {a}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" /> ~{item.prepTimeMinutes} min
          </span>
          <button
            disabled={!item.available}
            onClick={() => onAdd(item)}
            className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>
    </article>
  );
}
