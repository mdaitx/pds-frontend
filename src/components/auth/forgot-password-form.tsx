'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { recoverPassword } from '@/lib';
import { useAuth } from '@/hooks';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Formulário de recuperação de senha — protótipo Figma Make (/esqueci-senha): card, e-mail, enviar, voltar ao login.
 */
export function ForgotPasswordForm() {
  const { configError } = useAuth();
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

  if (configError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-medium">Configuração necessária</p>
        <p className="mt-1">{configError}</p>
        <p className="mt-2">
          Configure <code className="rounded bg-amber-100 px-1">.env.local</code> e reinicie o servidor.
        </p>
      </div>
    );
  }

  if (sent) {
    return (
      <Card className="border-zinc-200 shadow-xl">
        <CardContent className="pt-6">
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Se o e-mail existir na base, você receberá um link para redefinir a senha.
          </div>
          <Link
            href="/login"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-200 shadow-xl">
      <CardHeader className="pb-2">
        <h2 className="text-center text-xl font-semibold text-zinc-800">Recuperar a senha</h2>
        <p className="mt-1 text-center text-sm text-zinc-500">
          Informe seu e-mail para receber o link de redefinição.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email">E-mail *</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Enviando…' : 'Enviar link'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[0.9rem] text-zinc-500">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 font-semibold text-blue-600 transition-colors hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Voltar ao login
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
