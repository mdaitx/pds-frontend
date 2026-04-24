'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/hooks';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Formulário de cadastro — protótipo Figma Make (/cadastro): card, e-mail, senha, confirmar senha, mostrar/ocultar.
 */
export function SignupForm() {
  const router = useRouter();
  const { configError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

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

  if (success) {
    return (
      <Card className="border-zinc-200 shadow-xl">
        <CardContent className="pt-6">
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Conta criada. Verifique seu e-mail para confirmar (se a confirmação estiver ativada) e depois faça login.
          </div>
          <Link
            href="/login"
            className="mt-4 block w-full rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
          >
            Ir para login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-200 shadow-xl">
      <CardHeader className="pb-2">
        <h2 className="text-center text-xl font-semibold text-zinc-800">Criar conta</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="signup-email">E-mail *</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-password">
              Senha *{' '}
              <span className="text-[0.8rem] font-normal text-zinc-400">(mínimo 6 caracteres)</span>
            </Label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-confirm">Confirmar senha *</Label>
            <div className="relative">
              <Input
                id="signup-confirm"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
                aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
            {loading ? 'Criando conta...' : 'Cadastrar'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[0.9rem] text-zinc-500">
            Já tem conta?{' '}
            <Link href="/login" className="font-semibold text-blue-600 transition-colors hover:text-blue-700">
              Entrar
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
