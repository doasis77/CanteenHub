'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast('Passwords do not match', 'error');
      return;
    }
    if (!token) {
      toast('Missing reset token', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      toast('Password updated! You can sign in now.', 'success');
      router.push('/login');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Reset failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        Invalid reset link. Request a new one from{' '}
        <Link href="/forgot-password" className="font-medium underline">forgot password</Link>.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">New Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Confirm Password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {loading ? 'Updating...' : 'Reset Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">Reset password</h1>
        <p className="mb-6 text-slate-500">Choose a new password for your account.</p>
        <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-orange-50" />}>
          <ResetPasswordForm />
        </Suspense>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="text-orange-600 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
