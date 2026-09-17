'use client';

import { ORDER_STATUS_FLOW } from '@/lib/constants';
import { cn, formatOrderStatus } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Props {
  status: string;
  estimatedTime?: string;
}

export function OrderTracker({ status, estimatedTime }: Props) {
  const isCancelled = status === 'CANCELLED';
  const currentIndex = ORDER_STATUS_FLOW.indexOf(status as (typeof ORDER_STATUS_FLOW)[number]);

  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-6">
      {isCancelled ? (
        <p className="text-center font-medium text-red-600">Order Cancelled</p>
      ) : (
        <ol className="relative flex flex-col gap-0 sm:flex-row sm:justify-between">
          {ORDER_STATUS_FLOW.map((step, index) => {
            const done = index <= currentIndex;
            const active = index === currentIndex;
            return (
              <li key={step} className="flex flex-1 items-center gap-3 sm:flex-col sm:text-center">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition',
                    done ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-200 text-slate-400',
                    active && 'ring-4 ring-orange-100'
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className={cn('text-xs font-medium sm:mt-2', done ? 'text-orange-700' : 'text-slate-400')}>
                  {formatOrderStatus(step)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {estimatedTime && !isCancelled && status !== 'COMPLETED' && (
        <p className="mt-4 text-center text-sm text-slate-500">
          Estimated ready:{' '}
          <strong>{new Date(estimatedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
        </p>
      )}
    </div>
  );
}
