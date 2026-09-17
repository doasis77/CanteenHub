'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetLink(null);
    try {
      const data = await api.auth.forgotPassword(email);
      toast(data.message, 'success');
      if (data.mockResetLink) setResetLink(data.mockResetLink);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Request failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">Forgot password</h1>
        <p className="mb-6 text-slate-500">Enter your email and we&apos;ll send a reset link.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {resetLink && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Dev mock link:</p>
            <Link href={resetLink} className="break-all text-orange-600 hover:underline">
              {resetLink}
            </Link>
          </div>
        )}

        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="text-orange-600 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
