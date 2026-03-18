'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks';
import { getDrivers, type Driver } from '@/lib';
import { Card } from '@/components/ui/card';

const STATUS_LABEL: Record<Driver['status'], string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
};

export default function MotoristasPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [list, setList] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER') {
      router.replace('/dashboard');
      return;
    }
    getDrivers()
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
            href="/dashboard/motoristas/novo"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Novo motorista
          </Link>
        </div>
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Motoristas</h1>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <Card className="p-6">
          {list.length === 0 ? (
            <p className="text-zinc-500">
              Nenhum motorista cadastrado.{' '}
              <Link href="/dashboard/motoristas/novo" className="text-blue-600 hover:underline">
                Cadastrar primeiro motorista
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {list.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-4 first:pt-0">
                  <div className="flex items-center gap-4">
                    {d.photoUrl ? (
                      <Image
                        src={d.photoUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 text-lg font-medium">
                        {d.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-zinc-900">{d.name}</p>
                      <p className="text-sm text-zinc-500">
                        CPF {d.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')} · {STATUS_LABEL[d.status]}
                        {d.commissionPct != null && ` · ${d.commissionPct}% comissão`}
                      </p>
                      {d.preferredVehicle && (
                        <p className="text-xs text-zinc-400">
                          Veículo preferencial: {d.preferredVehicle.plate} {d.preferredVehicle.model}
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/motoristas/${d.id}`}
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
