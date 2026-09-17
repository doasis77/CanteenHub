'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', vegetarian: false, vegan: false });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.profile.get(),
    enabled: !!user,
  });

  const { data: loyalty, isLoading } = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => api.loyalty.get(),
    enabled: !!user,
  });

  const p = profile?.user as Record<string, unknown> | undefined;
  const prefs = p?.dietaryPreferences as Record<string, boolean> | undefined;

  const startEdit = () => {
    setForm({
      fullName: (p?.fullName as string) || user?.fullName || '',
      phone: (p?.phone as string) || '',
      vegetarian: prefs?.vegetarian || false,
      vegan: prefs?.vegan || false,
    });
    setEditing(true);
  };

  const saveProfile = async () => {
    try {
      await api.profile.update(form);
      toast('Profile updated', 'success');
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['profile'] });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4">Please log in to view your profile</p>
        <Link href="/login" className="text-orange-600 hover:underline">Login</Link>
      </div>
    );
  }

  const tierColors: Record<string, string> = {
    BRONZE: 'bg-amber-100 text-amber-800',
    SILVER: 'bg-slate-200 text-slate-700',
    GOLD: 'bg-yellow-100 text-yellow-800',
  };

  const silverThreshold = (loyalty?.config?.tiers as Record<string, { threshold: number }>)?.SILVER?.threshold || 500;
  const goldThreshold = (loyalty?.config?.tiers as Record<string, { threshold: number }>)?.GOLD?.threshold || 1500;
  const lifetime = loyalty?.lifetimeEarned || 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <div className="rounded-2xl border border-orange-100 bg-white p-6">
        {!editing ? (
          <>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-2xl">
                {(p?.photoUrl as string) ? '🖼️' : '👤'}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.fullName}</h2>
                <p className="text-slate-500">{user.email}</p>
                <p className="text-sm text-slate-400">Campus ID: {user.studentId}</p>
                {prefs && (
                  <p className="mt-1 text-xs text-emerald-600">
                    {[prefs.vegetarian && 'Vegetarian', prefs.vegan && 'Vegan'].filter(Boolean).join(' · ') || 'No dietary prefs set'}
                  </p>
                )}
              </div>
            </div>
            <button onClick={startEdit} className="mt-4 text-sm text-orange-600 hover:underline">
              Edit profile
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Full name"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Phone"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.vegetarian} onChange={(e) => setForm({ ...form, vegetarian: e.target.checked })} />
              Vegetarian
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.vegan} onChange={(e) => setForm({ ...form, vegan: e.target.checked })} />
              Vegan
            </label>
            <div className="flex gap-2">
              <button onClick={saveProfile} className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white">Save</button>
              <button onClick={() => setEditing(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-orange-50" />
      ) : loyalty && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700">Loyalty Points</p>
              <p className="text-4xl font-bold text-orange-600">{loyalty.balance}</p>
              <p className="text-sm text-amber-600">≈ {formatCurrency(loyalty.redeemableValue)} redeemable</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${tierColors[loyalty.tier] || tierColors.BRONZE}`}>
              {loyalty.tier} Tier
            </span>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-amber-700">
              <span>Tier progress</span>
              <span>{lifetime} / {goldThreshold} pts</span>
            </div>
            <div className="h-2 rounded-full bg-amber-200">
              <div
                className="h-2 rounded-full bg-orange-600"
                style={{ width: `${Math.min(100, (lifetime / goldThreshold) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-amber-600">Silver at {silverThreshold} · Gold at {goldThreshold}</p>
          </div>
        </div>
      )}

      {loyalty?.transactions && (
        <div className="rounded-2xl border border-orange-100 bg-white p-4">
          <h3 className="mb-3 font-semibold">Points History</h3>
          <div className="space-y-2">
            {loyalty.transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between border-b border-slate-50 py-2 text-sm last:border-0">
                <div>
                  <p>{tx.description || tx.transactionType}</p>
                  <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={tx.pointsEarned > 0 ? 'text-emerald-600' : 'text-red-500'}>
                  {tx.pointsEarned > 0 ? `+${tx.pointsEarned}` : `-${tx.pointsRedeemed}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
