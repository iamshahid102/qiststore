'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiPost } from '@/lib/api';
import { saveAuth, type StoredAuth } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiPost<StoredAuth>('/auth/register', form);
      saveAuth(data);
      router.push('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-3 sm:px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
      <p className="mt-1 text-sm text-gray-500">Register with your mobile number to place installment orders.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">Full name</span>
          <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">Mobile number</span>
          <input required pattern="^(\+92|0)3\d{9}$" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="03XX-XXXXXXX" className="w-full rounded border border-gray-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">Password (min 6 characters)</span>
          <input required minLength={6} type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {loading ? 'Creating account…' : 'Register'}
        </button>
        <p className="text-center text-sm text-gray-500">
          Already registered? <Link href="/account/login" className="text-brand-600 hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
