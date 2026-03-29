'use client';

/**
 * Lista de veículos — mesmo estilo visual das páginas Usuários e Motoristas.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';
import { deleteVehicle, getVehicles, type Vehicle } from '@/lib';
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

const statusConfig: Record<
  Vehicle['status'],
  { label: string; className: string }
> = {
  ACTIVE: { label: 'Ativo', className: 'bg-green-100 text-green-800' },
  INACTIVE: { label: 'Inativo', className: 'bg-zinc-100 text-zinc-600' },
  MAINTENANCE: { label: 'Manutenção', className: 'bg-yellow-100 text-yellow-800' },
};

function VehicleCardInner({ vehicle }: { vehicle: Vehicle }) {
  const cfg = statusConfig[vehicle.status];
  return (
    <div>
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
          <Truck className="h-12 w-12 text-zinc-400" />
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
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER') {
      router.replace('/dashboard');
      return;
    }
    setLoading(true);
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
  const filteredVehicles = useMemo(() => {
    return list.filter((vehicle) => {
      if (filterActive && vehicle.status !== 'ACTIVE') return false;
      if (filterMaintenance && vehicle.status !== 'MAINTENANCE') return false;
      if (filterInactive && vehicle.status !== 'INACTIVE') return false;
      if (q) {
        const hay = `${vehicle.plate} ${vehicle.brand} ${vehicle.model} ${vehicle.nickname ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [list, filterActive, filterMaintenance, filterInactive, q]);

  const hasFilters = filterActive || filterMaintenance || filterInactive || search.trim().length > 0;

  const clearFilters = () => {
    setFilterActive(false);
    setFilterMaintenance(false);
    setFilterInactive(false);
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
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-1 flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao dashboard
            </Link>
            <h1 className="text-xl font-semibold text-zinc-900 md:text-2xl">Veículos</h1>
            <p className="mt-0.5 text-zinc-500" style={{ fontSize: '0.85rem' }}>
              Frota cadastrada (placa, documentação e status). Use a busca e os filtros para refinar a lista.
            </p>
          </div>
          <Link
            href="/dashboard/veiculos/novo"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Novo veículo
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Buscar por placa, marca ou modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Buscar veículos"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Situação:</span>
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          ) : filteredVehicles.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <Truck className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
              <p className="text-zinc-500">Nenhum veículo corresponde à busca ou aos filtros.</p>
              <Button type="button" variant="outline" className="mt-4" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <div key={vehicle.id} className="h-full">
                <div
                  className="h-full cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir detalhes do veículo ${vehicle.plate}`}
                  onClick={() => router.push(`/dashboard/veiculos/${vehicle.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/dashboard/veiculos/${vehicle.id}`);
                    }
                  }}
                >
                  <Card className="h-full border-zinc-200 p-4 transition-all hover:border-blue-300 hover:shadow-md">
                    <VehicleCardInner vehicle={vehicle} />
                    <div
                      className="mt-3 flex flex-wrap gap-2"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Link href={`/dashboard/veiculos/${vehicle.id}`} className="min-w-0 flex-1">
                        <Button
                          variant="outline"
                          className="w-full justify-center gap-1.5 border-0 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-100"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteTarget(vehicle)}
                        className="justify-center gap-1.5 border-0 bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100"
                        aria-label={`Excluir veículo ${vehicle.plate}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            ))
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancelar
                </Button>
                <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
