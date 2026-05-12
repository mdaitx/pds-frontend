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
      <div className="rounded-xl border border-amber-300/70 bg-amber-100 p-3 text-sm text-amber-950 dark:border-amber-600/60 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-medium">Configuração necessária</p>
        <p className="mt-1">{configError}</p>
        <p className="mt-2">
          Configure <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-900/50">.env.local</code> e reinicie o
          servidor.
        </p>
      </div>
    );
  }

  if (sent) {
    return (
      <Card className="border-border shadow-xl">
        <CardContent className="pt-6">
          <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
            Se o e-mail existir na base, você receberá um link para redefinir a senha.
          </div>
          <Link
            href="/login"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-xl">
      <CardHeader className="pb-2">
        <h2 className="text-center text-xl font-semibold text-foreground">Recuperar a senha</h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
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
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Enviando…' : 'Enviar link'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[0.9rem] text-muted-foreground">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 font-semibold text-primary transition-colors duration-200 hover:text-primary-hover"
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
