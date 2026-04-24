'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button, Input, Label } from '@/components/ui';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw new Error(err.message);
      setSuccess(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Senha alterada. Faça login com a nova senha.
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

  const fromEmail = searchParams.get('token_hash') || searchParams.get('type');

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {!fromEmail && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Acesse esta página pelo link enviado no seu e-mail.
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <Label htmlFor="password" className="block">
          Nova senha
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="mt-1 bg-white"
        />
      </div>
      <div>
        <Label htmlFor="confirm" className="block">
          Confirmar senha
        </Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={loading}
          className="mt-1 bg-white"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        loading={loading}
        className="w-full"
      >
        {loading ? 'Salvando…' : 'Definir nova senha'}
      </Button>
      <p className="text-center text-sm text-zinc-600">
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-800">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
