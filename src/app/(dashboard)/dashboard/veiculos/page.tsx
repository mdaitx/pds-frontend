'use client';

/**
 * Lista de veículos — mesmo estilo visual das páginas Usuários e Motoristas.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';
import {
  deleteVehicle,
  getVehicles,
  type Vehicle,
  type VehicleType,
  VEHICLE_TYPE_LABELS,
} from '@/lib';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Edit,
  Plus,
  Search,
  Trash2,
  Truck,
  Activity,
  Wrench,
  Ban,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { VehicleTruckOrTrailerIcon } from '@/components/vehicles/VehicleTruckOrTrailerIcon';
import { cn } from '@/lib/cn';
import { mobileFilterPillRowClass } from '@/lib/dashboard-mobile';
import { dashboardCardDeleteButtonClass, dashboardCardEditButtonClass } from '@/lib/dashboard-action-buttons';

const statusConfig: Record<
  Vehicle['status'],
  { label: string; className: string }
> = {
  ACTIVE: { label: 'Ativo', className: 'bg-green-100 text-green-800' },
  INACTIVE: { label: 'Inativo', className: 'bg-zinc-100 text-zinc-600' },
  MAINTENANCE: { label: 'Manutenção', className: 'bg-yellow-100 text-yellow-800' },
};

const singleVehicleTypeSealClass: Record<VehicleType, string> = {
  CAMINHAO: 'bg-sky-100 text-sky-900',
  CAVALO_MECANICO: 'bg-amber-100 text-amber-900',
  SEMI_REBOQUE: 'bg-violet-100 text-violet-900',
};

function VehicleCardInner({ vehicle }: { vehicle: Vehicle }) {
  const cfg = statusConfig[vehicle.status];
  const vt = (vehicle.vehicleType ?? 'CAMINHAO') as VehicleType;
  const sealClass = singleVehicleTypeSealClass[vt];
  return (
    <div>
      <div className="mb-2">
        <span
          className={`inline-block rounded-md px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${sealClass}`}
        >
          {VEHICLE_TYPE_LABELS[vt]}
        </span>
      </div>
      <div className="mb-3 flex h-28 w-full items-center justify-center rounded-lg bg-zinc-100">
        {vehicle.photoUrl ? (
          <Image
            src={vehicle.photoUrl}
            alt={`Foto do veículo ${vehicle.plate}`}
            width={320}
            height={112}
            className="h-28 w-full rounded-lg object-cover"
            unoptimized
          />
        ) : (
          <VehicleTruckOrTrailerIcon vehicleType={vt} className="h-12 w-12 text-zinc-400" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-mono text-zinc-900" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
            {vehicle.plate}
          </h3>
          <span className={`rounded-full px-2 py-0.5 text-xs ${cfg.className}`}>{cfg.label}</span>
        </div>
        <p className="mt-0.5 truncate text-zinc-700" style={{ fontSize: '0.88rem' }}>
          {vehicle.brand} {vehicle.model}
        </p>
        <p className="truncate text-zinc-500" style={{ fontSize: '0.8rem' }}>
          {vehicle.year}
          {vehicle.nickname ? ` · "${vehicle.nickname}"` : ''}
        </p>
      </div>
    </div>
  );
}

function PairedVehicleCardInner({ tractor, trailer }: { tractor: Vehicle; trailer: Vehicle }) {
  const cfg = statusConfig[tractor.status];
  return (
    <div>
      <div className="mb-2">
        <span className="inline-block rounded-md bg-indigo-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-indigo-800">
          Cavalo + semi-reboque
        </span>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-zinc-100">
          {tractor.photoUrl ? (
            <Image
              src={tractor.photoUrl}
              alt={`Cavalo ${tractor.plate}`}
              width={160}
              height={96}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <Truck className="h-9 w-9 text-zinc-400" aria-hidden />
          )}
        </div>
        <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-zinc-100">
          {trailer.photoUrl ? (
            <Image
              src={trailer.photoUrl}
              alt={`Semi-reboque ${trailer.plate}`}
              width={160}
              height={96}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <VehicleTruckOrTrailerIcon
              vehicleType={trailer.vehicleType ?? 'SEMI_REBOQUE'}
              className="h-9 w-9 text-zinc-300"
              aria-hidden
            />
          )}
        </div>
      </div>
      <p className="mb-0.5 text-[0.7rem] font-medium uppercase tracking-wide text-zinc-500">Placas</p>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-zinc-900" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
          {tractor.plate}
        </span>
        <span className="text-zinc-400" aria-hidden>
          +
        </span>
        <span className="font-mono text-zinc-900" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
          {trailer.plate}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${cfg.className}`}>{cfg.label}</span>
      </div>
      <div className="mt-3 space-y-1 border-t border-zinc-100 pt-2" style={{ fontSize: '0.82rem' }}>
        <p className="text-zinc-700">
          <span className="text-zinc-500">Cavalo:</span> {tractor.brand} {tractor.model} · {tractor.year}
          {tractor.nickname ? ` · "${tractor.nickname}"` : ''}
        </p>
        <p className="text-zinc-700">
          <span className="text-zinc-500">Semi:</span> {trailer.brand} {trailer.model} · {trailer.year}
          {trailer.nickname ? ` · "${trailer.nickname}"` : ''}
        </p>
      </div>
    </div>
  );
}

type DisplayUnit =
  | { kind: 'paired'; tractor: Vehicle; trailer: Vehicle }
  | { kind: 'single'; vehicle: Vehicle };

function buildDisplayUnits(list: Vehicle[]): DisplayUnit[] {
  const inPair = new Set<string>();
  const units: DisplayUnit[] = [];

  for (const v of list) {
    if (v.vehicleType !== 'CAVALO_MECANICO' || !v.trailerVehicle?.id) continue;
    const trailer = list.find((t) => t.id === v.trailerVehicle!.id);
    if (!trailer || inPair.has(v.id)) continue;
    units.push({ kind: 'paired', tractor: v, trailer });
    inPair.add(v.id);
    inPair.add(trailer.id);
  }

  for (const v of list) {
    if (!inPair.has(v.id)) units.push({ kind: 'single', vehicle: v });
  }

  units.sort((a, b) => {
    const pa = a.kind === 'paired' ? a.tractor.plate : a.vehicle.plate;
    const pb = b.kind === 'paired' ? b.tractor.plate : b.vehicle.plate;
    return pa.localeCompare(pb, 'pt-BR');
  });

  return units;
}

function StatCard(props: { label: string; value: number; icon: ReactNode; iconWrapClass: string }) {
  const { label, value, icon, iconWrapClass } = props;
  return (
    <Card className="border-zinc-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconWrapClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-zinc-500" style={{ fontSize: '0.78rem' }}>
            {label}
          </p>
          <p className="text-zinc-900" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function VeiculosPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [list, setList] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  const [filterMaintenance, setFilterMaintenance] = useState(false);
  const [filterInactive, setFilterInactive] = useState(false);
  const [filterCaminhao, setFilterCaminhao] = useState(false);
  const [filterCavaloMecanico, setFilterCavaloMecanico] = useState(false);
  const [filterSemiReboque, setFilterSemiReboque] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session || !appUser) return;
    const fleetStaff = appUser.role === 'OWNER' || appUser.role === 'ADMIN';
    if (!fleetStaff) {
      router.replace('/dashboard');
      return;
    }
    queueMicrotask(() => setLoading(true));
    setError(null);
    getVehicles()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  const q = search.trim().toLowerCase();

  const vehicleMatches = useCallback(
    (vehicle: Vehicle) => {
      if (filterActive && vehicle.status !== 'ACTIVE') return false;
      if (filterMaintenance && vehicle.status !== 'MAINTENANCE') return false;
      if (filterInactive && vehicle.status !== 'INACTIVE') return false;
      if (q) {
        const pairHay =
          vehicle.trailerVehicle?.plate ??
          vehicle.tractorVehicle?.plate ??
          '';
        const hay = `${vehicle.plate} ${vehicle.brand} ${vehicle.model} ${vehicle.nickname ?? ''} ${VEHICLE_TYPE_LABELS[(vehicle.vehicleType ?? 'CAMINHAO') as VehicleType]} ${pairHay}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    },
    [filterActive, filterMaintenance, filterInactive, q]
  );

  const typeFiltersActive = filterCaminhao || filterCavaloMecanico || filterSemiReboque;
  const matchesTypeFilter = useCallback(
    (v: Vehicle) =>
      (filterCaminhao && v.vehicleType === 'CAMINHAO') ||
      (filterCavaloMecanico && v.vehicleType === 'CAVALO_MECANICO') ||
      (filterSemiReboque && v.vehicleType === 'SEMI_REBOQUE'),
    [filterCaminhao, filterCavaloMecanico, filterSemiReboque]
  );

  const displayUnits = useMemo(() => {
    const units = buildDisplayUnits(list);
    return units.filter((u) => {
      if (typeFiltersActive) {
        if (u.kind === 'paired') {
          if (!matchesTypeFilter(u.tractor) && !matchesTypeFilter(u.trailer)) return false;
        } else if (!matchesTypeFilter(u.vehicle)) {
          return false;
        }
      }
      if (u.kind === 'paired') {
        return vehicleMatches(u.tractor) || vehicleMatches(u.trailer);
      }
      return vehicleMatches(u.vehicle);
    });
  }, [list, typeFiltersActive, matchesTypeFilter, vehicleMatches]);

  const hasFilters =
    filterActive ||
    filterMaintenance ||
    filterInactive ||
    typeFiltersActive ||
    search.trim().length > 0;

  const clearFilters = () => {
    setFilterActive(false);
    setFilterMaintenance(false);
    setFilterInactive(false);
    setFilterCaminhao(false);
    setFilterCavaloMecanico(false);
    setFilterSemiReboque(false);
    setSearch('');
  };

  const totalCount = list.length;
  const activeCount = list.filter((v) => v.status === 'ACTIVE').length;
  const maintenanceCount = list.filter((v) => v.status === 'MAINTENANCE').length;
  const inactiveCount = list.filter((v) => v.status === 'INACTIVE').length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVehicle(deleteTarget.id);
      setList((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      toast.success(`Veículo ${deleteTarget.plate} removido.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir veículo.');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Carregando…</p>
      </div>
    );
  }

  return (
    <DashboardPageShell maxWidth="6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="mb-1 flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao dashboard
            </Link>
            <h1 className="break-words text-xl font-semibold text-zinc-900 md:text-2xl">Veículos</h1>
            <p className="mt-0.5 text-zinc-500" style={{ fontSize: '0.85rem' }}>
              Frota cadastrada (placa, documentação e status). Use a busca e os filtros para refinar a lista.
            </p>
          </div>
          <Link
            href="/dashboard/veiculos/novo"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Novo veículo
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <div className="relative w-full min-w-0 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Buscar por placa, marca ou modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Buscar veículos"
          />
        </div>

        <div className={cn(mobileFilterPillRowClass)}>
          <div className="flex w-max min-w-full flex-wrap items-center gap-2 sm:w-auto sm:min-w-0">
          <span className="shrink-0 text-xs font-medium text-zinc-500">Situação:</span>
          <button
            type="button"
            onClick={() => setFilterActive(!filterActive)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterActive
                ? 'border border-green-300 bg-green-100 text-green-800'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {filterActive ? '✓ ' : ''}Ativo
          </button>
          <button
            type="button"
            onClick={() => setFilterMaintenance(!filterMaintenance)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterMaintenance
                ? 'border border-yellow-300 bg-yellow-100 text-yellow-800'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {filterMaintenance ? '✓ ' : ''}Manutenção
          </button>
          <button
            type="button"
            onClick={() => setFilterInactive(!filterInactive)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterInactive
                ? 'border border-zinc-400 bg-zinc-200 text-zinc-800'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {filterInactive ? '✓ ' : ''}Inativo
          </button>
          <span className="mx-1 hidden h-4 w-px bg-zinc-200 sm:inline" aria-hidden />
          <span className="w-full text-xs font-medium text-zinc-500 sm:w-auto">Tipo:</span>
          <button
            type="button"
            onClick={() => setFilterCaminhao(!filterCaminhao)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterCaminhao
                ? 'border border-sky-300 bg-sky-100 text-sky-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {filterCaminhao ? '✓ ' : ''}
            {VEHICLE_TYPE_LABELS.CAMINHAO}
          </button>
          <button
            type="button"
            onClick={() => setFilterCavaloMecanico(!filterCavaloMecanico)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterCavaloMecanico
                ? 'border border-amber-300 bg-amber-100 text-amber-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {filterCavaloMecanico ? '✓ ' : ''}
            {VEHICLE_TYPE_LABELS.CAVALO_MECANICO}
          </button>
          <button
            type="button"
            onClick={() => setFilterSemiReboque(!filterSemiReboque)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterSemiReboque
                ? 'border border-violet-300 bg-violet-100 text-violet-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {filterSemiReboque ? '✓ ' : ''}
            {VEHICLE_TYPE_LABELS.SEMI_REBOQUE}
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
            >
              Limpar filtros
            </button>
          )}
          </div>
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          <StatCard
            label="Total de veículos"
            value={totalCount}
            icon={<Truck className="h-5 w-5 text-blue-600" />}
            iconWrapClass="bg-blue-100"
          />
          <StatCard
            label="Ativos"
            value={activeCount}
            icon={<Activity className="h-5 w-5 text-green-600" />}
            iconWrapClass="bg-green-100"
          />
          <StatCard
            label="Manutenção"
            value={maintenanceCount}
            icon={<Wrench className="h-5 w-5 text-yellow-700" />}
            iconWrapClass="bg-yellow-100"
          />
          <StatCard
            label="Inativos"
            value={inactiveCount}
            icon={<Ban className="h-5 w-5 text-zinc-600" />}
            iconWrapClass="bg-zinc-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <Truck className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
              <p className="text-zinc-500">Nenhum veículo cadastrado.</p>
              <Link
                href="/dashboard/veiculos/novo"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Adicionar veículo
              </Link>
            </div>
          ) : displayUnits.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <Truck className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
              <p className="text-zinc-500">Nenhum veículo corresponde à busca ou aos filtros.</p>
              <Button type="button" variant="outline" className="mt-4" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            displayUnits.map((unit) =>
              unit.kind === 'paired' ? (
                <div key={`pair-${unit.tractor.id}`} className="h-full">
                  <div
                    className="h-full cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Conjunto ${unit.tractor.plate} e ${unit.trailer.plate}`}
                    onClick={() => router.push(`/dashboard/veiculos/${unit.tractor.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/dashboard/veiculos/${unit.tractor.id}`);
                      }
                    }}
                  >
                    <Card className="h-full border-indigo-200/80 bg-gradient-to-b from-white to-indigo-50/40 p-4 transition-all hover:border-indigo-300 hover:shadow-md">
                      <PairedVehicleCardInner tractor={unit.tractor} trailer={unit.trailer} />
                      <div
                        className="mt-3 flex flex-wrap gap-2"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Link href={`/dashboard/veiculos/${unit.tractor.id}`} className="min-w-0 flex-1">
                          <Button variant="outline" className={dashboardCardEditButtonClass}>
                            <Edit className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteTarget(unit.tractor)}
                          className={dashboardCardDeleteButtonClass}
                          aria-label={`Excluir conjunto (cavalo ${unit.tractor.plate})`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
              ) : (
                <div key={unit.vehicle.id} className="h-full">
                  <div
                    className="h-full cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir detalhes do veículo ${unit.vehicle.plate}`}
                    onClick={() => router.push(`/dashboard/veiculos/${unit.vehicle.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/dashboard/veiculos/${unit.vehicle.id}`);
                      }
                    }}
                  >
                    <Card className="h-full border-zinc-200 p-4 transition-all hover:border-blue-300 hover:shadow-md">
                      <VehicleCardInner vehicle={unit.vehicle} />
                      <div
                        className="mt-3 flex flex-wrap gap-2"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Link href={`/dashboard/veiculos/${unit.vehicle.id}`} className="min-w-0 flex-1">
                          <Button variant="outline" className={dashboardCardEditButtonClass}>
                            <Edit className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteTarget(unit.vehicle)}
                          className={dashboardCardDeleteButtonClass}
                          aria-label={`Excluir veículo ${unit.vehicle.plate}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
              ),
            )
          )}
        </div>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <h3 className="mb-2 font-semibold text-zinc-900">Confirmar exclusão</h3>
              <p className="mb-4 text-sm text-zinc-600">
                Tem certeza que deseja excluir o veículo <strong>{deleteTarget.plate}</strong>? Esta ação não pode
                ser desfeita.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancelar
                </Button>
                <Button
                  className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </div>
          </div>
        )}
    </DashboardPageShell>
  );
}
