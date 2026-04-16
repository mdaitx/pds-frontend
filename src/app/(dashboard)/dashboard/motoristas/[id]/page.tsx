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
import {
  dashboardToolbarDeleteButtonClass,
  dashboardToolbarEditButtonClass,
} from '@/lib/dashboard-action-buttons';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const statusConfig: Record<DriverStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Ativo', className: 'bg-green-100 text-green-800' },
  INACTIVE: { label: 'Inativo', className: 'bg-zinc-100 text-zinc-600' },
};

const roleConfig = {
  label: 'Motorista',
  className: 'bg-green-100 text-green-800',
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
        <p className="text-zinc-500 text-xs">{label}</p>
        <p className="text-zinc-800 text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function PermissionItem({ label, granted }: { label: string; granted: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${granted ? 'bg-green-500' : 'bg-zinc-300'}`} />
      <span className={`text-sm ${granted ? 'text-zinc-700' : 'text-zinc-400'}`}>{label}</span>
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="p-6 text-center">
        <p className="text-zinc-500">{loadError || 'Motorista não encontrado.'}</p>
        <Link href="/dashboard/motoristas">
          <Button variant="outline" className="mt-4">
            Voltar aos motoristas
          </Button>
        </Link>
      </div>
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
            className="flex items-center gap-1 text-zinc-500 hover:text-zinc-700 transition-colors mb-1 text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar aos motoristas
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-zinc-900 text-xl font-semibold">{driver.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${cfg.className}`}>{cfg.label}</span>
          </div>
        </div>

      {/* Profile Card */}
      <Card className="border-zinc-200">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {driver.photoUrl ? (
              <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={driver.photoUrl} alt={driver.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                <UserCircle className="w-16 h-16 text-zinc-400" />
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-zinc-900 text-xl font-bold">{driver.name}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1.5 ${roleConfig.className}`}>
                  <Shield className="w-3.5 h-3.5" />
                  {roleConfig.label}
                </span>
              </div>
              <p className="text-zinc-500 mt-2 text-sm">{roleConfig.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="border-zinc-200">
        <CardHeader className="pb-2">
          <h3 className="text-zinc-700 font-medium">Informações de Contato</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {driver.email && (
              <InfoRow
                icon={Mail}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                label="E-mail"
                value={driver.email}
              />
            )}
            {driver.phone && (
              <InfoRow
                icon={Phone}
                iconBg="bg-green-50"
                iconColor="text-green-600"
                label="Telefone"
                value={formatPhoneBr(driver.phone)}
              />
            )}
            {driver.cpf && (
              <InfoRow
                icon={FileText}
                iconBg="bg-zinc-50"
                iconColor="text-zinc-600"
                label="CPF"
                value={formatCpf(driver.cpf)}
              />
            )}
            {driver.cnh && (
              <InfoRow
                icon={FileText}
                iconBg="bg-zinc-50"
                iconColor="text-zinc-600"
                label="CNH"
                value={driver.cnh}
              />
            )}
            <InfoRow
              icon={Calendar}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
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
      <Card className="border-zinc-200">
        <CardHeader className="pb-2">
          <h3 className="text-zinc-700 font-medium">Dados Financeiros</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <InfoRow
              icon={DollarSign}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              label="Comissão"
              value={`${driver.commissionPct ?? '-'}%`}
            />
            <InfoRow
              icon={DollarSign}
              iconBg="bg-amber-50"
              iconColor="text-amber-700"
              label="Salário mensal"
              value={formatCurrency(driver.monthlySalary ?? 0)}
            />
            <InfoRow
              icon={CreditCard}
              iconBg="bg-green-50"
              iconColor="text-green-600"
              label="Forma de pagamento"
              value={driver.paymentMethod ? PAYMENT_LABELS[driver.paymentMethod] ?? driver.paymentMethod : '-'}
            />
            {driver.pixKey && (
              <InfoRow
                icon={CreditCard}
                iconBg="bg-zinc-50"
                iconColor="text-zinc-600"
                label="Chave PIX"
                value={driver.pixKey}
              />
            )}
            {driver.preferredVehicle && (
              <InfoRow
                icon={Activity}
                iconBg="bg-purple-50"
                iconColor="text-purple-600"
                label="Veículo preferencial"
                value={`${driver.preferredVehicle.plate} · ${driver.preferredVehicle.model}`}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats & Permissions */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h3 className="text-zinc-700 font-medium">Resumo</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              icon={Activity}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              label="Total de viagens"
              value={String(trips.length)}
            />
            <InfoRow
              icon={Activity}
              iconBg="bg-green-50"
              iconColor="text-green-600"
              label="Viagens concluídas"
              value={String(completedTrips.length)}
            />
            <InfoRow
              icon={DollarSign}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
              label="Faturamento total"
              value={formatCurrency(totalRevenue)}
            />
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h3 className="text-zinc-700 font-medium">Permissões</h3>
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
      <Card className="border-zinc-200">
        <CardHeader className="pb-2">
          <h3 className="text-zinc-700 font-medium">Viagens Recentes</h3>
        </CardHeader>
        <CardContent>
          {trips.length === 0 ? (
            <p className="text-zinc-500 py-8 text-center text-sm">Nenhuma viagem registrada para este motorista.</p>
          ) : (
            <div className="space-y-3">
              {trips.slice(0, 5).map((trip) => (
                <Link key={trip.id} href={`/dashboard/viagens/${trip.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-900 font-semibold text-sm">
                        {(trip.origin ?? '').split(',')[0]} → {(trip.destination ?? '').split(',')[0]}
                      </p>
                      <p className="text-zinc-500 text-xs">{new Date(trip.startDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-900 font-semibold">
                        {trip.freightValue != null ? formatCurrency(trip.freightValue) : '-'}
                      </p>
                      <p
                        className={`text-xs ${
                          trip.status === 'COMPLETED'
                            ? 'text-green-600'
                            : trip.status === 'IN_PROGRESS'
                              ? 'text-blue-600'
                              : trip.status === 'PENDING'
                                ? 'text-yellow-600'
                                : 'text-zinc-500'
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
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-zinc-900 font-semibold mb-2">Confirmar Exclusão</h3>
            <p className="text-zinc-600 text-sm py-2">
              Tem certeza que deseja excluir o motorista <strong>{driver.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Cancelar
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
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
