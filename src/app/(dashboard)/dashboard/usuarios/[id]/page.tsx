'use client';

/**
 * Detalhes do usuário — staff (OWNER/ADMIN/DRIVER).
 * Para usuário motorista (DRIVER), exibe dados da conta + dados vinculados do motorista na frota.
 */
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  Shield,
  UserCircle,
  FileText,
  Calendar,
  Settings,
  Truck,
} from 'lucide-react';
import { useAuth } from '@/hooks';
import {
  getCompanyStaff,
  getDrivers,
  getTrips,
  deleteCompanyStaffUser,
  type CompanyStaffMember,
  type Driver,
  formatCpf,
  formatPhoneBr,
} from '@/lib';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { LoadingMessage } from '@/components/ui/loading';
import {
  dashboardToolbarDeleteButtonClass,
  dashboardToolbarEditButtonClass,
} from '@/lib/dashboard-action-buttons';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const roleConfig: Record<string, { label: string; className: string; description: string }> = {
  OWNER: {
    label: 'Co-proprietário',
    className:
      'bg-purple-100 text-purple-900 dark:bg-purple-500/22 dark:text-purple-100 [&_svg]:text-purple-700 dark:[&_svg]:text-purple-200',
    description: 'Mesmo acesso operacional do dono titular, incluindo configurações da empresa.',
  },
  ADMIN: {
    label: 'Administrador',
    className:
      'bg-blue-100 text-blue-900 dark:bg-blue-500/22 dark:text-blue-50 [&_svg]:text-blue-700 dark:[&_svg]:text-blue-200',
    description: 'Viagens, veículos, motoristas e acertos. Sem edição de dados cadastrais da empresa.',
  },
  DRIVER: {
    label: 'Usuário motorista',
    className:
      'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/22 dark:text-emerald-50 [&_svg]:text-emerald-700 dark:[&_svg]:text-emerald-200',
    description: 'Acesso limitado às próprias viagens, despesas e acertos.',
  },
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

function staffDisplayName(m: CompanyStaffMember): string {
  if (m.name?.trim()) return m.name.trim();
  const local = m.email?.split('@')[0];
  return local || m.email;
}

export default function DetalheUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { session, appUser, loading: authLoading } = useAuth();
  const [member, setMember] = useState<CompanyStaffMember | null>(null);
  const [linkedDriver, setLinkedDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<
    { id: string; origin: string | null; destination: string | null; startDate: string; status: string; freightValue: number | null }[]
  >([]);
  const [appIsPrimaryOwner, setAppIsPrimaryOwner] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    Promise.all([getCompanyStaff(), getDrivers(), getTrips()])
      .then(([staffRes, drivers, tList]) => {
        const staffMember = staffRes.staff.find((s) => s.id === id);
        const driverMatch = drivers.find(
          (d) => (d.email ?? '').trim().toLowerCase() === (staffMember?.email ?? '').trim().toLowerCase()
        );
        if (!staffMember) {
          setLoadError('Usuário não encontrado.');
          setMember(null);
          setLinkedDriver(null);
          setTrips([]);
          return;
        }
        const me = staffRes.staff.find((s) => s.id === appUser.id);
        setAppIsPrimaryOwner(!!me?.isPrimaryOwner);
        setMember(staffMember);
        setLinkedDriver(driverMatch ?? null);
        if (driverMatch) {
          const driverTrips = tList.filter((t) => t.driverId === driverMatch.id);
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
        } else {
          setTrips([]);
        }
        setLoadError(null);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : 'Erro ao carregar');
        setMember(null);
        setLinkedDriver(null);
        setTrips([]);
      })
      .finally(() => setPageLoading(false));
  }, [session, appUser, id, router]);

  const handleDelete = async () => {
    if (!member) return;
    setDeleting(true);
    try {
      await deleteCompanyStaffUser(member.id);
      router.replace('/dashboard/usuarios');
    } catch {
      setDeleting(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <DashboardPageShell maxWidth="3xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage message="Carregando usuário…" className="text-muted-foreground" />
        </div>
      </DashboardPageShell>
    );
  }

  if (!member) {
    return (
      <DashboardPageShell maxWidth="3xl">
        <Card className="border-border shadow-sm">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{loadError || 'Usuário não encontrado.'}</p>
            <Link href="/dashboard/usuarios">
              <Button variant="outline" className="mt-4">
                Voltar aos usuários
              </Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardPageShell>
    );
  }

  const cfg = roleConfig[member.role] ?? roleConfig.ADMIN;
  const canEdit =
    (appUser?.role === 'OWNER' && appIsPrimaryOwner) ||
    (appUser?.role === 'ADMIN' && !member.isPrimaryOwner && member.id !== appUser?.id) ||
    (appUser?.role === 'OWNER' && !appIsPrimaryOwner && member.id === appUser?.id);
  const canDelete =
    appUser?.role === 'OWNER' &&
    appIsPrimaryOwner &&
    !member.isPrimaryOwner &&
    member.id !== appUser?.id;

  const isDriverUser = member.role === 'DRIVER';

  return (
    <DashboardPageShell maxWidth="3xl">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/usuarios"
          className="mb-1 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar aos usuários
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{staffDisplayName(member)}</h1>
          <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${cfg.className}`}>
            {cfg.label}
          </span>
          {member.isPrimaryOwner && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950/45 dark:text-amber-100">
              Titular
            </span>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <Card className="border-border shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {member.photoUrl ? (
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-border">
                <Image
                  src={member.photoUrl}
                  alt={staffDisplayName(member)}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted">
                <UserCircle className="h-16 w-16 text-muted-foreground/80" />
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">{staffDisplayName(member)}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1.5 ${cfg.className}`}>
                  <Shield className="w-3.5 h-3.5" />
                  {cfg.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{cfg.description}</p>
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
            <InfoRow
              icon={Mail}
              iconBg="bg-blue-500/12 ring-1 ring-inset ring-blue-600/15 dark:bg-blue-500/22 dark:ring-blue-400/25"
              iconColor="text-blue-700 dark:text-blue-300"
              label="E-mail"
              value={member.email}
            />
            {member.phone && (
              <InfoRow
                icon={Phone}
                iconBg="bg-emerald-500/12 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-500/22 dark:ring-emerald-400/25"
                iconColor="text-emerald-700 dark:text-emerald-300"
                label="Telefone"
                value={formatPhoneBr(member.phone)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dados do motorista na frota (quando usuário motorista tem cadastro vinculado) */}
      {isDriverUser && linkedDriver && (
        <>
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <h3 className="font-medium text-foreground">Cadastro na Frota</h3>
              <Link href={`/dashboard/motoristas/${linkedDriver.id}`}>
                <Button variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
                  <Truck className="w-3.5 h-3.5" />
                  Ver detalhes completos
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {linkedDriver.cpf && (
                  <InfoRow
                    icon={FileText}
                    iconBg="bg-muted"
                    iconColor="text-muted-foreground"
                    label="CPF"
                    value={formatCpf(linkedDriver.cpf)}
                  />
                )}
                {linkedDriver.cnh && (
                  <InfoRow
                    icon={FileText}
                    iconBg="bg-muted"
                    iconColor="text-muted-foreground"
                    label="CNH"
                    value={linkedDriver.cnh}
                  />
                )}
                <InfoRow
                  icon={Calendar}
                  iconBg="bg-purple-500/12 ring-1 ring-inset ring-purple-600/15 dark:bg-purple-500/22 dark:ring-purple-400/25"
                  iconColor="text-purple-700 dark:text-purple-300"
                  label="Cadastrado em"
                  value={new Date(linkedDriver.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                />
              </div>
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

          {trips.length > 0 && (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <h3 className="font-medium text-foreground">Viagens Recentes</h3>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Permissões para OWNER/ADMIN */}
      {!isDriverUser && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <h3 className="font-medium text-foreground">Permissões</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{cfg.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Aviso quando usuário motorista sem cadastro na frota */}
      {isDriverUser && !linkedDriver && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/35 dark:bg-amber-950/30">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Este usuário possui perfil motorista, mas ainda não há cadastro correspondente na frota com o mesmo e-mail. Os dados de comissão, viagens e acertos aparecerão quando o motorista for cadastrado em Motoristas com este e-mail.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 justify-end">
        {member.isPrimaryOwner && member.id === appUser?.id && (
          <Link href="/dashboard/config">
            <Button
              variant="outline"
              className="flex items-center gap-2 border-blue-600/28 bg-blue-500/10 text-blue-900 hover:bg-blue-500/18 dark:bg-blue-500/18 dark:text-blue-100 dark:hover:bg-blue-500/28"
            >
              <Settings className="w-4 h-4" />
              Configurações da empresa
            </Button>
          </Link>
        )}
        {canEdit && (
          <Link href={`/dashboard/usuarios/${id}/editar`}>
            <Button variant="outline" className={dashboardToolbarEditButtonClass}>
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          </Link>
        )}
        {linkedDriver && (
          <Link href={`/dashboard/motoristas/${linkedDriver.id}`}>
            <Button variant="outline" className="flex items-center gap-2 border-border">
              <Truck className="w-4 h-4" />
              Ver motorista na frota
            </Button>
          </Link>
        )}
        {canDelete && (
          <Button
            variant="outline"
            className={dashboardToolbarDeleteButtonClass}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        )}
      </div>

      {/* Delete Dialog */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-2 font-semibold text-foreground">Confirmar Exclusão</h3>
            <p className="py-2 text-sm text-muted-foreground">
              Tem certeza que deseja remover <strong className="text-foreground">{staffDisplayName(member)}</strong> da
              equipe? A conta de login será excluída. O cadastro na frota (se existir) permanece. Esta ação não pode ser
              desfeita.
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
