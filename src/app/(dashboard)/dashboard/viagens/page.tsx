'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
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
import { getTripsList, type Trip, type TripStatus } from '@/lib';
import { Card, CardContent, Input, Skeleton } from '@/components/ui';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { ViagensCardsSkeleton } from '@/components/dashboard/DashboardLoadingSkeleton';
import { VehicleTruckOrTrailerIcon } from '@/components/vehicles/VehicleTruckOrTrailerIcon';
import { cn } from '@/lib/cn';
import { mobileFilterPillRowClass } from '@/lib/dashboard-mobile';
import { dashboardSearchIconLeftClass } from '@/lib/dashboard-field-classes';
import {
  dashboardLinkCardEditClass,
  dashboardLinkPrimaryClass,
  dashboardLinkPrimarySmClass,
} from '@/lib/dashboard-action-buttons';

const PAGE_SIZE = 6;
const SEARCH_DEBOUNCE_MS = 400;

/** Alinhado ao bundle publicado do Figma Make (iU / nU). */
const STATUS_LABEL: Record<TripStatus, string> = {
  PENDING: 'Aguardando',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const STATUS_PILL: Record<TripStatus, string> = {
  PENDING:
    'bg-amber-100 text-amber-900 dark:bg-amber-500/18 dark:text-amber-100',
  IN_PROGRESS:
    'bg-blue-100 text-blue-900 dark:bg-blue-500/22 dark:text-blue-50',
  COMPLETED:
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/22 dark:text-emerald-50',
  CANCELLED: 'bg-muted text-muted-foreground',
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

export default function ViagensPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const { clearTripsActivity } = useActivityHint();
  const [statusFilter, setStatusFilter] = useState<'' | TripStatus>('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const canViewTrips = Boolean(
    session && appUser && (appUser.role === 'OWNER' || appUser.role === 'ADMIN' || appUser.role === 'DRIVER'),
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const tripsQuery = useQuery({
    queryKey: ['trips-list', appUser?.id, appUser?.role, statusFilter, debouncedSearch, page, PAGE_SIZE],
    queryFn: () =>
      getTripsList(
        {
          page,
          pageSize: PAGE_SIZE,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(debouncedSearch ? { q: debouncedSearch } : {}),
        },
        session?.access_token,
      ),
    enabled: canViewTrips,
    staleTime: 60_000,
    retry: false,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    clearTripsActivity();
  }, [clearTripsActivity]);

  useEffect(() => {
    queueMicrotask(() => setPage(1));
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    if (!session || !appUser) return;
    const fleetStaff = appUser.role === 'OWNER' || appUser.role === 'ADMIN';
    if (!fleetStaff && appUser.role !== 'DRIVER') {
      router.replace('/dashboard');
    }
  }, [session, appUser, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  const isFleetStaff = appUser?.role === 'OWNER' || appUser?.role === 'ADMIN';
  const title = isFleetStaff ? 'Viagens' : 'Minhas viagens';

  const data = tripsQuery.data;
  const isPlaceholder = tripsQuery.isPlaceholderData;
  const errorMessage =
    tripsQuery.isError && tripsQuery.error instanceof Error ? tripsQuery.error.message : null;

  const totalPages = data ? Math.max(1, data.totalPages) : 1;
  useEffect(() => {
    queueMicrotask(() => setPage((p) => Math.min(p, totalPages)));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages);
  const items: Trip[] = data?.items ?? [];
  const totalInFilter = data?.total ?? 0;
  const showEmpty = data != null && data.total === 0 && !isPlaceholder;
  const showList = (data?.items.length ?? 0) > 0;

  const countFor = (v: '' | TripStatus) => {
    if (!data) return 0;
    if (v === '') return data.counts.all;
    return data.counts.byStatus[v] ?? 0;
  };

  if (authLoading || (tripsQuery.isPending && !data)) {
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
              prefetch={false}
              className="mb-1 flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              style={{ fontSize: '0.85rem' }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao dashboard
            </Link>
            <h1 className="break-words text-foreground" style={{ fontWeight: 600, fontSize: '1.35rem' }}>
              {title}
            </h1>
          </div>
          {isFleetStaff && (
            <Link
              href="/dashboard/viagens/novo"
              prefetch={false}
              className={cn(dashboardLinkPrimaryClass, 'w-full sm:w-auto')}
            >
              <Plus className="h-4 w-4" />
              Nova viagem
            </Link>
          )}
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div
          className={cn('relative w-full', tripsQuery.isFetching && 'opacity-80 transition-opacity')}
        >
          <Search className={dashboardSearchIconLeftClass} />
          <Input
            type="search"
            placeholder="Buscar por código, motorista, veículo ou rota..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
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
                className={cn(
                  'rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors',
                  active
                    ? 'border border-primary bg-primary text-primary-foreground'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted/70 dark:bg-muted/40 dark:hover:bg-muted/60',
                )}
                style={{ fontSize: '0.83rem', fontWeight: active ? 600 : 400 }}
              >
                {tab.label}
                {tab.value !== '' && (
                  <span
                    className={cn(
                      'ml-1.5 rounded-full px-1.5 py-0.5 text-xs',
                      active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>

        {showEmpty ? (
          <Card className="border-border shadow-sm">
            <CardContent className="py-16 text-center">
              <Truck className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" aria-hidden />
              <p className="font-medium text-foreground">Nenhuma viagem encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {(data?.counts.all ?? 0) === 0
                  ? 'Cadastre uma viagem para acompanhar fretes e despesas.'
                  : 'Tente outro filtro, status ou termo na busca.'}
              </p>
              {isFleetStaff && (
                <Link
                  href="/dashboard/viagens/novo"
                  prefetch={false}
                  className={cn(dashboardLinkPrimaryClass, 'mt-6 inline-flex')}
                >
                  <Plus className="h-4 w-4" />
                  Criar primeira viagem
                </Link>
              )}
            </CardContent>
          </Card>
        ) : showList ? (
          <div className="space-y-3">
            {items.map((t) => {
              const st = STATUS_PILL[t.status];
              const lbl = STATUS_LABEL[t.status];
              return (
                <Card
                  key={t.id}
                  className={cn(
                    'transition-all hover:shadow-sm',
                    t.displacementToLoad === true
                      ? 'border border-amber-500/35 bg-amber-500/[0.09] hover:border-amber-500/55 hover:bg-amber-500/15 dark:bg-amber-500/14'
                      : 'border-border hover:border-primary/35',
                  )}
                >
                  <CardContent className="p-0">
                    <div
                      role="link"
                      tabIndex={0}
                      className="cursor-pointer p-4 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                          <span className="text-foreground" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            {t.code}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${st}`} style={{ fontWeight: 600 }}>
                            {lbl}
                          </span>
                          {t.displacementToLoad === true && (
                            <span className="inline-flex rounded-md bg-amber-200/95 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-950 dark:bg-amber-500/35 dark:text-amber-50">
                              Deslocamento
                            </span>
                          )}
                        </div>
                        <div
                          className="mt-1 flex items-center gap-2 text-muted-foreground"
                          style={{ fontSize: '0.85rem' }}
                        >
                          <VehicleTruckOrTrailerIcon
                            vehicleType={t.vehicle?.vehicleType}
                            className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/80"
                          />
                          <span className="truncate">
                            {t.vehicle
                              ? `${t.vehicle.plate} · ${t.vehicle.brand} ${t.vehicle.model}`
                              : 'Veículo não encontrado'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground" style={{ fontSize: '0.83rem' }}>
                          Motorista: {t.driver?.name || 'Não atribuído'}
                        </p>
                        <p className="mt-1 text-foreground/90" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {(t.origin ?? '—').split(',')[0]} → {(t.destination ?? '—').split(',')[0]}
                        </p>
                        <div
                          className="mt-1 flex flex-wrap items-center gap-4 text-muted-foreground"
                          style={{ fontSize: '0.78rem' }}
                        >
                          <span>
                            {new Date(t.startDate).toLocaleDateString('pt-BR')}
                            {t.endDate ? ` → ${new Date(t.endDate).toLocaleDateString('pt-BR')}` : ''}
                          </span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {t.freightValue != null ? formatBRL(t.freightValue) : '—'}
                          </span>
                        </div>
                      </div>
                      <div
                        className="flex w-full flex-shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {t.status === 'COMPLETED' && t.displacementToLoad !== true && (
                          <Link
                            href={`/dashboard/viagens/${t.id}/acerto`}
                            prefetch={false}
                            className={dashboardLinkPrimarySmClass}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Acerto
                          </Link>
                        )}
                        {isFleetStaff && t.status !== 'COMPLETED' && (
                          <Link
                            href={`/dashboard/viagens/${t.id}/editar`}
                            prefetch={false}
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
              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={safePage <= 1 || tripsQuery.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-foreground transition-colors hover:bg-muted/70 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-muted/50"
                  style={{ fontSize: '0.82rem' }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <p className="text-center text-muted-foreground" style={{ fontSize: '0.82rem' }}>
                  Página <span className="font-medium text-foreground">{safePage}</span> de{' '}
                  <span className="font-medium text-foreground">{totalPages}</span>
                  <span className="text-muted-foreground/80">
                    {' '}
                    · {totalInFilter} {totalInFilter === 1 ? 'viagem' : 'viagens'}
                  </span>
                </p>
                <button
                  type="button"
                  disabled={safePage >= totalPages || tripsQuery.isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-foreground transition-colors hover:bg-muted/70 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-muted/50"
                  style={{ fontSize: '0.82rem' }}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ) : null}
    </DashboardPageShell>
  );
}
