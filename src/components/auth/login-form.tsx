'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/hooks';

/**
 * Formulário de login: e-mail/senha via Supabase Auth.
 *
 * - Se configError (env não configurado), mostra mensagem em vez do form.
 * - Após login bem-sucedido, redireciona para /dashboard com window.location.href
 *   para garantir que a nova sessão esteja disponível ao carregar a página.
 */
export function LoginForm() {
  const router = useRouter();
  const { configError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (configError) {
    return (
      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-medium">Configuração necessária</p>
        <p className="mt-1">{configError}</p>
        <p className="mt-2">
          Configure <code className="rounded bg-amber-100 px-1">.env.local</code> e reinicie o servidor.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw new Error(err.message);
      // Redireciona só quando há sessão; pequeno delay para o Supabase persistir no storage
      if (data.session) {
        await new Promise((r) => setTimeout(r, 150));
        window.location.href = '/dashboard';
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
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
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-blue-600 hover:text-blue-800"
        >
          Esqueci a senha
        </Link>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
      <p className="text-center text-sm text-zinc-600">
        Não tem conta?{' '}
        <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-800">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
