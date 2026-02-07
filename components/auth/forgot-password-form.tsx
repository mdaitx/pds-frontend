'use client';

import { useState } from 'react';
import Link from 'next/link';
import { recoverPassword } from '@/lib/api';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await recoverPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar e-mail');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Se o e-mail existir na base, você receberá um link para redefinir a
          senha.
        </div>
        <Link
          href="/login"
          className="block w-full rounded-lg border border-zinc-300 px-4 py-2 text-center font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Enviando…' : 'Enviar link'}
      </button>
      <p className="text-center text-sm text-zinc-600">
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-800">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
