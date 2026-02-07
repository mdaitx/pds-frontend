'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function formatAuthError(message: string): string {
    if (message.includes('rate limit') || message.includes('429')) {
      return 'Limite de envio de e-mails atingido no momento. Aguarde cerca de 1 hora ou, em desenvolvimento: no Supabase (Authentication > Providers > Email), desative "Confirm email" para não enviar e-mail no cadastro.';
    }
    if (message.includes('invalid') && message.includes('email')) {
      return 'E-mail inválido. Use um endereço de e-mail real e válido (ex.: seuemail@gmail.com).';
    }
    if (message.includes('already registered') || message.includes('already exists')) {
      return 'Este e-mail já está cadastrado. Faça login ou use "Esqueci a senha".';
    }
    return message;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/`,
        },
      });
      if (err) throw new Error(err.message);
      if (data.session) {
        router.push('/');
        router.refresh();
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao cadastrar';
      setError(formatAuthError(msg));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Conta criada. Verifique seu e-mail para confirmar (se a confirmação
          estiver ativada) e depois faça login.
        </div>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
        >
          Ir para login
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
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-zinc-500">Mínimo 6 caracteres.</p>
      </div>
      <p className="text-xs text-zinc-500">
        Use um e-mail válido (ex.: nome@gmail.com). E-mails de teste ou inválidos são bloqueados.
      </p>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Cadastrando…' : 'Cadastrar'}
      </button>
      <p className="text-center text-sm text-zinc-600">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-800">
          Entrar
        </Link>
      </p>
    </form>
  );
}
