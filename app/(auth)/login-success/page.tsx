'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import { Card } from '@/components/ui/card';

export default function LoginSuccessPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (!session || loading) return;
    const t = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(t);
          router.replace('/');
          router.refresh();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [session, loading, router]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-8 w-8"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-zinc-900">Login realizado com sucesso</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Redirecionando para o dashboard em <strong>{countdown}</strong> segundo{countdown !== 1 ? 's' : ''}…
        </p>
        <Link
          href="/"
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
        >
          Continuar agora
        </Link>
      </div>
    </Card>
  );
}
