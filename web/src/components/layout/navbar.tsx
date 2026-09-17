'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, User, ChefHat, Shield, Menu as MenuIcon } from 'lucide-react';
import { NotificationsBell } from '@/components/layout/notifications-bell';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const studentLinks = [
  { href: '/menu', label: 'Menu' },
  { href: '/cart', label: 'Cart' },
  { href: '/orders', label: 'Orders' },
  { href: '/profile', label: 'Profile' },
];

export function Navbar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const localItems = useCartStore((s) => s.localItems);
  const summary = useCartStore((s) => s.summary);
  const syncFromServer = useCartStore((s) => s.syncFromServer);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) syncFromServer();
  }, [user, syncFromServer]);

  const cartCount = user ? summary?.itemCount || 0 : localItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="sticky top-0 z-40 border-b border-orange-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/menu" className="flex items-center gap-2 font-bold text-orange-600">
          <span className="text-2xl">🍽️</span>
          <span className="hidden sm:inline">Campus Canteen</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {studentLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition',
                pathname === link.href
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {link.label}
            </Link>
          ))}
          {user?.role === 'STAFF' && (
            <Link href="/staff" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              <ChefHat className="h-4 w-4" /> Staff
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link href="/admin" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user && <NotificationsBell />}
          <Link href="/cart" className="relative rounded-lg p-2 hover:bg-orange-50">
            <ShoppingCart className="h-5 w-5 text-orange-600" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-xs text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="max-w-[120px] truncate text-sm text-slate-600">{user.fullName}</span>
              <button
                onClick={logout}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-1 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 sm:flex"
            >
              <User className="h-4 w-4" /> Login
            </Link>
          )}

          <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)}>
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-orange-100 bg-white px-4 py-3 md:hidden">
          {studentLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-orange-50"
            >
              {link.label}
            </Link>
          ))}
          {!user && (
            <Link href="/login" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-orange-600">
              Login / Register
            </Link>
          )}
          {user && (
            <button onClick={logout} className="block w-full px-3 py-2 text-left text-sm text-red-600">
              Logout
            </button>
          )}
        </div>
      )}
    </header>
  );
}
