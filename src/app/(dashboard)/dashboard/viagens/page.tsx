'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import { getTrips, type Trip, type TripStatus } from '@/lib';
import { Card } from '@/components/ui/card';

const STATUS_LABEL: Record<TripStatus, string> = {
  PENDING: 'Aguardando',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export default function ViagensPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [list, setList] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER') {
      router.replace('/dashboard');
      return;
    }
    getTrips(statusFilter || undefined)
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, router, statusFilter]);

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
            href="/dashboard/viagens/novo"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Nova viagem
          </Link>
        </div>
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Viagens</h1>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="statusFilter" className="mr-2 text-sm text-zinc-600">Filtrar por status:</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="PENDING">Aguardando</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="COMPLETED">Concluída</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>

        <Card className="p-6">
          {list.length === 0 ? (
            <p className="text-zinc-500">
              Nenhuma viagem cadastrada.{' '}
              <Link href="/dashboard/viagens/novo" className="text-blue-600 hover:underline">
                Cadastrar primeira viagem
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {list.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-4 first:pt-0">
                  <div>
                    <p className="font-medium text-zinc-900">
                      {t.code} · {t.vehicle?.plate} · {t.driver?.name}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {t.origin || '—'} → {t.destination || '—'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(t.startDate).toLocaleDateString('pt-BR')}
                      {t.freightValue != null && ` · R$ ${t.freightValue.toLocaleString('pt-BR')}`}
                      {' · '}
                      <span className={
                        t.status === 'COMPLETED' ? 'text-green-600' :
                        t.status === 'CANCELLED' ? 'text-red-600' :
                        t.status === 'IN_PROGRESS' ? 'text-blue-600' : 'text-zinc-500'
                      }>
                        {STATUS_LABEL[t.status]}
                      </span>
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/viagens/${t.id}`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Ver / Editar
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
