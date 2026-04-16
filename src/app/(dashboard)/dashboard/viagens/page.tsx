'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Truck,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { useAuth, useActivityHint } from '@/hooks';
import { getTrips, type Trip, type TripStatus } from '@/lib';
import { Card, CardContent, Input, Skeleton } from '@/components/ui';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { ViagensCardsSkeleton } from '@/components/dashboard/DashboardLoadingSkeleton';
import { VehicleTruckOrTrailerIcon } from '@/components/vehicles/VehicleTruckOrTrailerIcon';
import { cn } from '@/lib/cn';
import { mobileFilterPillRowClass } from '@/lib/dashboard-mobile';
import {
  dashboardLinkCardEditClass,
  dashboardLinkPrimaryClass,
  dashboardLinkPrimarySmClass,
} from '@/lib/dashboard-action-buttons';

const PAGE_SIZE = 6;

/** Alinhado ao bundle publicado do Figma Make (iU / nU). */
const STATUS_LABEL: Record<TripStatus, string> = {
  PENDING: 'Aguardando',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const STATUS_PILL: Record<TripStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-zinc-100 text-zinc-600',
};

const FILTER_TABS: { value: '' | TripStatus; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'PENDING', label: 'Aguardando' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function tripSearchHaystack(t: Trip): string {
  const v = t.vehicle;
  const vehicleStr = v ? `${v.plate} ${v.brand} ${v.model}` : '';
  return [
    t.code,
    t.driver?.name ?? '',
    vehicleStr,
    t.origin ?? '',
    t.destination ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

export default function ViagensPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const { clearTripsActivity } = useActivityHint();
  const [list, setList] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'' | TripStatus>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    clearTripsActivity();
  }, [clearTripsActivity]);

  useEffect(() => {
    if (!session || !appUser) return;
    const fleetStaff = appUser.role === 'OWNER' || appUser.role === 'ADMIN';
    if (!fleetStaff && appUser.role !== 'DRIVER') {
      router.replace('/dashboard');
      return;
    }
    queueMicrotask(() => setLoading(true));
    getTrips()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  const isFleetStaff = appUser?.role === 'OWNER' || appUser?.role === 'ADMIN';
  const title = isFleetStaff ? 'Viagens' : 'Minhas viagens';

  const sorted = useMemo(() => {
    const byStatus = statusFilter === '' ? list : list.filter((t) => t.status === statusFilter);
    const q = searchQuery.trim().toLowerCase();
    const filtered =
      q === '' ? byStatus : byStatus.filter((t) => tripSearchHaystack(t).includes(q));
    return [...filtered].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [list, statusFilter, searchQuery]);

  useEffect(() => {
    queueMicrotask(() => setPage(1));
  }, [statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  useEffect(() => {
    queueMicrotask(() => setPage((p) => Math.min(p, totalPages)));
  }, [totalPages]);
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const p = Math.min(page, totalPages);
    const start = (p - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page, totalPages]);

  const countFor = (v: '' | TripStatus) =>
    v === '' ? list.length : list.filter((t) => t.status === v).length;

  if (authLoading || loading) {
    return (
      <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="4xl">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-56 max-w-full" />
        </div>
        <Skeleton className="mt-4 h-10 w-full rounded-lg sm:max-w-md" />
        <ViagensCardsSkeleton count={4} />
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell className="settings-font-inter tracking-tight" maxWidth="4xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="mb-1 flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-700"
              style={{ fontSize: '0.85rem' }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao dashboard
            </Link>
            <h1 className="break-words text-zinc-900" style={{ fontWeight: 600, fontSize: '1.35rem' }}>
              {title}
            </h1>
          </div>
          {isFleetStaff && (
            <Link
              href="/dashboard/viagens/novo"
              className={cn(dashboardLinkPrimaryClass, 'w-full sm:w-auto')}
            >
              <Plus className="h-4 w-4" />
              Nova viagem
            </Link>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="search"
            placeholder="Buscar por código, motorista, veículo ou rota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white pl-9"
            style={{ fontSize: '0.875rem' }}
            autoComplete="off"
          />
        </div>

        <div className={cn(mobileFilterPillRowClass)}>
          <div className="flex w-max min-w-full flex-nowrap gap-1 sm:w-auto sm:flex-wrap">
          {FILTER_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            const count = countFor(tab.value);
            return (
              <button
                key={tab.value || 'ALL'}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'
                }`}
                style={{ fontSize: '0.83rem', fontWeight: active ? 600 : 400 }}
              >
                {tab.label}
                {tab.value !== '' && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                      active ? 'bg-blue-500 text-white' : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>

        {sorted.length === 0 ? (
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="py-16 text-center">
              <Truck className="mx-auto mb-4 h-12 w-12 text-zinc-300" aria-hidden />
              <p className="text-zinc-800 font-medium">Nenhuma viagem encontrada</p>
              <p className="mt-1 text-sm text-zinc-500">
                {list.length === 0
                  ? 'Cadastre uma viagem para acompanhar fretes e despesas.'
                  : 'Tente outro filtro, status ou termo na busca.'}
              </p>
              {isFleetStaff && (
                <Link
                  href="/dashboard/viagens/novo"
                  className={cn(dashboardLinkPrimaryClass, 'mt-6 inline-flex')}
                >
                  <Plus className="h-4 w-4" />
                  Criar primeira viagem
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pageSlice.map((t) => {
              const st = STATUS_PILL[t.status];
              const lbl = STATUS_LABEL[t.status];
              return (
                <Card
                  key={t.id}
                  className="border-zinc-200 transition-all hover:border-blue-200 hover:shadow-sm"
                >
                  <CardContent className="p-0">
                    <div
                      role="link"
                      tabIndex={0}
                      className="cursor-pointer p-4 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      aria-label={`Abrir viagem ${t.code}`}
                      onClick={() => router.push(`/dashboard/viagens/${t.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push(`/dashboard/viagens/${t.id}`);
                        }
                      }}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-zinc-900" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            {t.code}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${st}`} style={{ fontWeight: 600 }}>
                            {lbl}
                          </span>
                        </div>
                        <div
                          className="mt-1 flex items-center gap-2 text-zinc-600"
                          style={{ fontSize: '0.85rem' }}
                        >
                          <VehicleTruckOrTrailerIcon
                            vehicleType={t.vehicle?.vehicleType}
                            className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400"
                          />
                          <span className="truncate">
                            {t.vehicle
                              ? `${t.vehicle.plate} · ${t.vehicle.brand} ${t.vehicle.model}`
                              : 'Veículo não encontrado'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-zinc-500" style={{ fontSize: '0.83rem' }}>
                          Motorista: {t.driver?.name || 'Não atribuído'}
                        </p>
                        <p className="mt-1 text-zinc-700" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {(t.origin ?? '—').split(',')[0]} → {(t.destination ?? '—').split(',')[0]}
                        </p>
                        <div
                          className="mt-1 flex flex-wrap items-center gap-4 text-zinc-500"
                          style={{ fontSize: '0.78rem' }}
                        >
                          <span>
                            {new Date(t.startDate).toLocaleDateString('pt-BR')}
                            {t.endDate ? ` → ${new Date(t.endDate).toLocaleDateString('pt-BR')}` : ''}
                          </span>
                          <span className="text-green-700" style={{ fontWeight: 600 }}>
                            {t.freightValue != null ? formatBRL(t.freightValue) : '—'}
                          </span>
                        </div>
                      </div>
                      <div
                        className="flex w-full flex-shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {t.status === 'COMPLETED' && (
                          <Link
                            href={`/dashboard/viagens/${t.id}/acerto`}
                            className={dashboardLinkPrimarySmClass}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Acerto
                          </Link>
                        )}
                        {isFleetStaff && (
                          <Link
                            href={`/dashboard/viagens/${t.id}/editar`}
                            className={dashboardLinkCardEditClass}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Link>
                        )}
                      </div>
                    </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-700 transition-colors hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40"
                  style={{ fontSize: '0.82rem' }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <p className="text-center text-zinc-500" style={{ fontSize: '0.82rem' }}>
                  Página <span className="font-medium text-zinc-800">{safePage}</span> de{' '}
                  <span className="font-medium text-zinc-800">{totalPages}</span>
                  <span className="text-zinc-400">
                    {' '}
                    · {sorted.length} {sorted.length === 1 ? 'viagem' : 'viagens'}
                  </span>
                </p>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-700 transition-colors hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40"
                  style={{ fontSize: '0.82rem' }}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
    </DashboardPageShell>
  );
}
