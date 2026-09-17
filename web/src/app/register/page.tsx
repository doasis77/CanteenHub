'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/toast';

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    studentId: '',
    phone: '',
    inviteCode: '',
  });
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(form);
      toast('Account created! Check email verification (mock).', 'success');
      router.push('/menu');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Registration failed', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">Create account</h1>
        <p className="mb-6 text-slate-500">Join the campus canteen platform</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: 'fullName', label: 'Full Name', type: 'text' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'studentId', label: 'Student ID', type: 'text' },
            { key: 'phone', label: 'Phone (optional)', type: 'tel', required: false },
            { key: 'password', label: 'Password', type: 'password' },
            { key: 'inviteCode', label: 'Staff Invite Code (optional)', type: 'text', required: false },
          ].map(({ key, label, type, required = true }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium">{label}</label>
              <input
                type={type}
                required={required}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-orange-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
