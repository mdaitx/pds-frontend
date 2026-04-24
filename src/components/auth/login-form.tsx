'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/hooks';
import { Card, CardHeader, CardContent } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Formulário de login: e-mail/senha via Supabase Auth.
 * Design adaptado do protótipo Figma Make (tema claro).
 */
export function LoginForm() {
  const router = useRouter();
  const { configError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (configError) {
    return (
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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
      if (data.session) {
        await new Promise((r) => setTimeout(r, 150));
        window.location.href = '/dashboard';
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao entrar';
      if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid_credentials')) {
        setError('E-mail ou senha incorretos. Verifique os dados ou cadastre-se primeiro.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Confirme seu e-mail antes de entrar. Verifique a caixa de entrada e spam.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-zinc-200 shadow-xl shadow-blue-950/10">
      <CardHeader className="pb-2">
        <h2 className="text-zinc-800 text-center text-xl font-semibold">Entrar na sua conta</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-blue-700 hover:text-blue-800 transition-colors text-sm"
              >
                Esqueceu a senha?
              </Link>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white"
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-zinc-500 text-sm">
            Não tem conta?{' '}
            <Link href="/signup" className="text-blue-700 hover:text-blue-800 transition-colors font-semibold">
              Cadastre-se
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
