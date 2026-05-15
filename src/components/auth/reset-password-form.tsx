'use client';

import { useEffect, useState } from 'react';
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
  const [sessionReady, setSessionReady] = useState(false);
  const [preparingSession, setPreparingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function prepareSessionFromEmailLink() {
      setPreparingSession(true);
      setError(null);
      try {
        const supabase = createClient();
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionError) throw new Error(setSessionError.message);
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        } else if (tokenHash && (type === 'recovery' || type === 'invite')) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'recovery' | 'invite',
          });
          if (verifyError) throw new Error(verifyError.message);
        } else if (searchParams.get('code')) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            searchParams.get('code') as string,
          );
          if (exchangeError) throw new Error(exchangeError.message);
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          throw new Error('Link inválido ou expirado. Solicite um novo e-mail de redefinição.');
        }
        if (mounted) setSessionReady(true);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Não foi possível validar o link.');
      } finally {
        if (mounted) setPreparingSession(false);
      }
    }
    void prepareSessionFromEmailLink();
    return () => {
      mounted = false;
    };
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!sessionReady) {
      setError('Sessão inválida para redefinir senha. Abra novamente o link do e-mail.');
      return;
    }
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
        <div className="rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-sm text-foreground dark:bg-accent/15">
          Senha alterada. Faça login com a nova senha.
        </div>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-primary px-4 py-2 text-center font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Ir para login
        </Link>
      </div>
    );
  }

  const fromEmail = searchParams.get('token_hash') || searchParams.get('type');

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {preparingSession && (
        <div className="rounded-md border border-sky-400/60 bg-sky-100 px-3 py-2 text-sm text-sky-950 dark:border-sky-600/55 dark:bg-sky-950/45 dark:text-sky-50">
          Validando link de acesso...
        </div>
      )}
      {!fromEmail && (
        <div className="rounded-md border border-amber-400/65 bg-amber-100 px-3 py-2 text-sm text-amber-950 dark:border-amber-600/55 dark:bg-amber-950/45 dark:text-amber-50">
          Acesse esta página pelo link enviado no seu e-mail.
        </div>
      )}
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Requisitos: mínimo de 6 caracteres.
        </p>
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
          className="mt-1"
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        disabled={loading || preparingSession || !sessionReady}
        loading={loading}
        className="w-full"
      >
        {loading ? 'Salvando…' : 'Definir nova senha'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
