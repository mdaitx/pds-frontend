'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks';
import { getVehicles, type Vehicle } from '@/lib';
import { Card } from '@/components/ui/card';

const STATUS_LABEL: Record<Vehicle['status'], string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  MAINTENANCE: 'Manutenção',
};

export default function VeiculosPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [list, setList] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER') {
      router.replace('/dashboard');
      return;
    }
    getVehicles()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Voltar ao dashboard
          </Link>
          <Link
            href="/dashboard/veiculos/novo"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Novo veículo
          </Link>
        </div>
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Veículos</h1>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <Card className="p-6">
          {list.length === 0 ? (
            <p className="text-zinc-500">
              Nenhum veículo cadastrado.{' '}
              <Link href="/dashboard/veiculos/novo" className="text-blue-600 hover:underline">
                Cadastrar primeiro veículo
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {list.map((v) => (
                <li key={v.id} className="flex items-center justify-between py-4 first:pt-0">
                  <div className="flex items-center gap-4">
                    {v.photoUrl ? (
                      <Image
                        src={v.photoUrl}
                        alt=""
                        width={80}
                        height={56}
                        className="h-14 w-20 rounded object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-14 w-20 items-center justify-center rounded bg-zinc-200 text-zinc-500 text-xs">
                        Sem foto
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-zinc-900">
                        {v.plate} · {v.brand} {v.model} ({v.year})
                      </p>
                      <p className="text-sm text-zinc-500">
                        {v.nickname || '—'} · {STATUS_LABEL[v.status]}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/veiculos/${v.id}`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Editar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
