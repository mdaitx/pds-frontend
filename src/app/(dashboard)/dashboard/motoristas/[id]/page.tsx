'use client';

/**
 * Detalhes do motorista — estilo UserDetail do Figma Make (tema claro).
 */
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  UserCircle,
  Mail,
  Phone,
  Shield,
  CreditCard,
  FileText,
  Calendar,
  DollarSign,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/hooks';
import { getDriver, getTrips, deleteDriver, formatCpf, formatPhoneBr } from '@/lib';
import type { Driver, DriverStatus } from '@/lib';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { LoadingMessage } from '@/components/ui/loading';
import {
  dashboardToolbarDeleteButtonClass,
  dashboardToolbarEditButtonClass,
} from '@/lib/dashboard-action-buttons';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const statusConfig: Record<DriverStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Ativo',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/22 dark:text-emerald-50',
  },
  INACTIVE: { label: 'Inativo', className: 'bg-muted text-muted-foreground' },
};

const roleConfig = {
  label: 'Motorista',
  className:
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/22 dark:text-emerald-50',
  description: 'Acesso limitado às próprias viagens, despesas e acertos.',
};

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'PIX',
  Transferência: 'Transferência',
  Dinheiro: 'Dinheiro',
  Outro: 'Outro',
};

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function InfoRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function PermissionItem({ label, granted }: { label: string; granted: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div
        className={`h-2 w-2 shrink-0 rounded-full ${granted ? 'bg-emerald-500' : 'bg-muted-foreground/35'}`}
      />
      <span className={`text-sm ${granted ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  );
}

export default function DetalheMotoristaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { session, appUser, loading: authLoading } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<
    { id: string; origin: string | null; destination: string | null; startDate: string; status: string; freightValue: number | null }[]
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!session || !appUser || !id) return;
    if (appUser.role !== 'OWNER' && appUser.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    queueMicrotask(() => setPageLoading(true));
    Promise.all([getDriver(id), getTrips()])
      .then(([d, tList]) => {
        setDriver(d);
        const driverTrips = tList.filter((t) => t.driverId === d.id);
        setTrips(
          driverTrips.map((t) => ({
            id: t.id,
            origin: t.origin,
            destination: t.destination,
            startDate: t.startDate,
            status: t.status,
            freightValue: t.freightValue,
          }))
        );
        setLoadError(null);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setPageLoading(false));
  }, [session, appUser, id, router]);

  const handleDelete = async () => {
    if (!driver) return;
    setDeleting(true);
    try {
      await deleteDriver(driver.id);
      router.replace('/dashboard/motoristas');
    } catch {
      setDeleting(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <DashboardPageShell maxWidth="3xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage message="Carregando motorista…" className="text-muted-foreground" />
        </div>
      </DashboardPageShell>
    );
  }

  if (!driver) {
    return (
      <DashboardPageShell maxWidth="3xl">
        <Card className="border-border shadow-sm">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{loadError || 'Motorista não encontrado.'}</p>
            <Link href="/dashboard/motoristas">
              <Button variant="outline" className="mt-4">
                Voltar aos motoristas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardPageShell>
    );
  }

  const cfg = statusConfig[driver.status];
  const completedTrips = trips.filter((t) => t.status === 'COMPLETED');
  const totalRevenue = completedTrips.reduce((sum, t) => sum + (t.freightValue ?? 0), 0);

  return (
    <DashboardPageShell maxWidth="3xl">
      {/* Header */}
      <div>
          <Link
            href="/dashboard/motoristas"
            className="mb-1 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar aos motoristas
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">{driver.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${cfg.className}`}>{cfg.label}</span>
          </div>
        </div>

      {/* Profile Card */}
      <Card className="border-border shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {driver.photoUrl ? (
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={driver.photoUrl} alt={driver.name} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted">
                <UserCircle className="h-16 w-16 text-muted-foreground/80" />
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">{driver.name}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1.5 ${roleConfig.className}`}>
                  <Shield className="w-3.5 h-3.5" />
                  {roleConfig.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{roleConfig.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <h3 className="font-medium text-foreground">Informações de Contato</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {driver.email && (
              <InfoRow
                icon={Mail}
                iconBg="bg-blue-500/12 ring-1 ring-inset ring-blue-600/15 dark:bg-blue-500/22 dark:ring-blue-400/25"
                iconColor="text-blue-700 dark:text-blue-300"
                label="E-mail"
                value={driver.email}
              />
            )}
            {driver.phone && (
              <InfoRow
                icon={Phone}
                iconBg="bg-emerald-500/12 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-500/22 dark:ring-emerald-400/25"
                iconColor="text-emerald-700 dark:text-emerald-300"
                label="Telefone"
                value={formatPhoneBr(driver.phone)}
              />
            )}
            {driver.cpf && (
              <InfoRow
                icon={FileText}
                iconBg="bg-muted"
                iconColor="text-muted-foreground"
                label="CPF"
                value={formatCpf(driver.cpf)}
              />
            )}
            {driver.cnh && (
              <InfoRow
                icon={FileText}
                iconBg="bg-muted"
                iconColor="text-muted-foreground"
                label="CNH"
                value={driver.cnh}
              />
            )}
            <InfoRow
              icon={Calendar}
              iconBg="bg-purple-500/12 ring-1 ring-inset ring-purple-600/15 dark:bg-purple-500/22 dark:ring-purple-400/25"
              iconColor="text-purple-700 dark:text-purple-300"
              label="Cadastrado em"
              value={new Date(driver.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Financial Info */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <h3 className="font-medium text-foreground">Dados Financeiros</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <InfoRow
              icon={DollarSign}
              iconBg="bg-blue-500/12 ring-1 ring-inset ring-blue-600/15 dark:bg-blue-500/22 dark:ring-blue-400/25"
              iconColor="text-blue-700 dark:text-blue-300"
              label="Comissão"
              value={`${driver.commissionPct ?? '-'}%`}
            />
            <InfoRow
              icon={DollarSign}
              iconBg="bg-amber-500/15 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/35 dark:ring-amber-500/35"
              iconColor="text-amber-900 dark:text-amber-400"
              label="Salário mensal"
              value={formatCurrency(driver.monthlySalary ?? 0)}
            />
            <InfoRow
              icon={CreditCard}
              iconBg="bg-emerald-500/12 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-500/22 dark:ring-emerald-400/25"
              iconColor="text-emerald-700 dark:text-emerald-300"
              label="Forma de pagamento"
              value={driver.paymentMethod ? PAYMENT_LABELS[driver.paymentMethod] ?? driver.paymentMethod : '-'}
            />
            {driver.pixKey && (
              <InfoRow
                icon={CreditCard}
                iconBg="bg-muted"
                iconColor="text-muted-foreground"
                label="Chave PIX"
                value={driver.pixKey}
              />
            )}
            {driver.preferredVehicle && (
              <InfoRow
                icon={Activity}
                iconBg="bg-purple-500/12 ring-1 ring-inset ring-purple-600/15 dark:bg-purple-500/22 dark:ring-purple-400/25"
                iconColor="text-purple-700 dark:text-purple-300"
                label="Veículo preferencial"
                value={`${driver.preferredVehicle.plate} · ${driver.preferredVehicle.model}`}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats & Permissions */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <h3 className="font-medium text-foreground">Resumo</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              icon={Activity}
              iconBg="bg-blue-500/12 ring-1 ring-inset ring-blue-600/15 dark:bg-blue-500/22 dark:ring-blue-400/25"
              iconColor="text-blue-700 dark:text-blue-300"
              label="Total de viagens"
              value={String(trips.length)}
            />
            <InfoRow
              icon={Activity}
              iconBg="bg-emerald-500/12 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-500/22 dark:ring-emerald-400/25"
              iconColor="text-emerald-700 dark:text-emerald-300"
              label="Viagens concluídas"
              value={String(completedTrips.length)}
            />
            <InfoRow
              icon={DollarSign}
              iconBg="bg-purple-500/12 ring-1 ring-inset ring-purple-600/15 dark:bg-purple-500/22 dark:ring-purple-400/25"
              iconColor="text-purple-700 dark:text-purple-300"
              label="Faturamento total"
              value={formatCurrency(totalRevenue)}
            />
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <h3 className="font-medium text-foreground">Permissões</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <PermissionItem label="Visualizar suas próprias viagens" granted />
              <PermissionItem label="Registrar despesas nas viagens" granted />
              <PermissionItem label="Visualizar seus acertos" granted />
              <PermissionItem label="Gerenciar viagens de outros" granted={false} />
              <PermissionItem label="Cadastrar veículos e motoristas" granted={false} />
              <PermissionItem label="Acessar configurações" granted={false} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trips */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <h3 className="font-medium text-foreground">Viagens Recentes</h3>
        </CardHeader>
        <CardContent>
          {trips.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma viagem registrada para este motorista.
            </p>
          ) : (
            <div className="space-y-3">
              {trips.slice(0, 5).map((trip) => (
                <Link key={trip.id} href={`/dashboard/viagens/${trip.id}`}>
                  <div className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-primary/35 hover:bg-muted/40 dark:hover:bg-muted/25">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {(trip.origin ?? '').split(',')[0]} → {(trip.destination ?? '').split(',')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(trip.startDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {trip.freightValue != null ? formatCurrency(trip.freightValue) : '-'}
                      </p>
                      <p
                        className={`text-xs ${
                          trip.status === 'COMPLETED'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : trip.status === 'IN_PROGRESS'
                              ? 'text-blue-700 dark:text-blue-400'
                              : trip.status === 'PENDING'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-muted-foreground'
                        }`}
                      >
                        {trip.status === 'COMPLETED'
                          ? 'Concluída'
                          : trip.status === 'IN_PROGRESS'
                            ? 'Em andamento'
                            : trip.status === 'PENDING'
                              ? 'Aguardando'
                              : 'Cancelada'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              {trips.length > 5 && (
                <Link href="/dashboard/viagens">
                  <Button variant="outline" className="w-full">
                    Ver todas as viagens
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 justify-end">
        <Link href={`/dashboard/motoristas/${id}/editar`}>
          <Button variant="outline" className={dashboardToolbarEditButtonClass}>
            <Edit className="h-4 w-4" />
            Editar
          </Button>
        </Link>
        <Button
          variant="outline"
          className={dashboardToolbarDeleteButtonClass}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </div>

      {/* Delete Dialog */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-2 font-semibold text-foreground">Confirmar Exclusão</h3>
            <p className="py-2 text-sm text-muted-foreground">
              Tem certeza que deseja excluir o motorista <strong className="text-foreground">{driver.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardPageShell>
  );
}
