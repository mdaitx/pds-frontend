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
} from '@/lib';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { Button } from '@/components/ui/button';

const roleConfig: Record<string, { label: string; className: string; description: string }> = {
  OWNER: {
    label: 'Co-proprietário',
    className: 'bg-purple-100 text-purple-800',
    description: 'Mesmo acesso operacional do dono titular, incluindo configurações da empresa.',
  },
  ADMIN: {
    label: 'Administrador',
    className: 'bg-blue-100 text-blue-800',
    description: 'Viagens, veículos, motoristas e acertos. Sem edição de dados cadastrais da empresa.',
  },
  DRIVER: {
    label: 'Usuário motorista',
    className: 'bg-green-100 text-green-800',
    description: 'Acesso limitado às próprias viagens, despesas e acertos.',
  },
};

function formatCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

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
    setPageLoading(true);
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6 text-center">
        <p className="text-zinc-500">{loadError || 'Usuário não encontrado.'}</p>
        <Link href="/dashboard/usuarios">
          <Button variant="outline" className="mt-4">
            Voltar aos usuários
          </Button>
        </Link>
      </div>
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
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/usuarios"
          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-700 transition-colors mb-1 text-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar aos usuários
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-zinc-900 text-xl font-semibold">{staffDisplayName(member)}</h1>
          <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${cfg.className}`}>
            {cfg.label}
          </span>
          {member.isPrimaryOwner && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">Titular</span>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <Card className="border-zinc-200">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {member.photoUrl ? (
              <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-200 relative">
                <Image
                  src={member.photoUrl}
                  alt={staffDisplayName(member)}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                <UserCircle className="w-16 h-16 text-zinc-400" />
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-zinc-900 text-xl font-bold">{staffDisplayName(member)}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1.5 ${cfg.className}`}>
                  <Shield className="w-3.5 h-3.5" />
                  {cfg.label}
                </span>
              </div>
              <p className="text-zinc-500 mt-2 text-sm">{cfg.description}</p>
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
            <InfoRow
              icon={Mail}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              label="E-mail"
              value={member.email}
            />
            {member.phone && (
              <InfoRow
                icon={Phone}
                iconBg="bg-green-50"
                iconColor="text-green-600"
                label="Telefone"
                value={member.phone}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dados do motorista na frota (quando usuário motorista tem cadastro vinculado) */}
      {isDriverUser && linkedDriver && (
        <>
          <Card className="border-zinc-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <h3 className="text-zinc-700 font-medium">Cadastro na Frota</h3>
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
                    iconBg="bg-zinc-50"
                    iconColor="text-zinc-600"
                    label="CPF"
                    value={formatCpf(linkedDriver.cpf)}
                  />
                )}
                {linkedDriver.cnh && (
                  <InfoRow
                    icon={FileText}
                    iconBg="bg-zinc-50"
                    iconColor="text-zinc-600"
                    label="CNH"
                    value={linkedDriver.cnh}
                  />
                )}
                <InfoRow
                  icon={Calendar}
                  iconBg="bg-purple-50"
                  iconColor="text-purple-600"
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

          {trips.length > 0 && (
            <Card className="border-zinc-200">
              <CardHeader className="pb-2">
                <h3 className="text-zinc-700 font-medium">Viagens Recentes</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trips.slice(0, 5).map((trip) => (
                    <Link key={trip.id} href={`/dashboard/viagens/${trip.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-900 font-semibold text-sm">
                            {(trip.origin ?? '').split(',')[0]} → {(trip.destination ?? '').split(',')[0]}
                          </p>
                          <p className="text-zinc-500 text-xs">
                            {new Date(trip.startDate).toLocaleDateString('pt-BR')}
                          </p>
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
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Permissões para OWNER/ADMIN */}
      {!isDriverUser && (
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h3 className="text-zinc-700 font-medium">Permissões</h3>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600 text-sm">{cfg.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Aviso quando usuário motorista sem cadastro na frota */}
      {isDriverUser && !linkedDriver && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-amber-800 text-sm">
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
              className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-0"
            >
              <Settings className="w-4 h-4" />
              Configurações da empresa
            </Button>
          </Link>
        )}
        {canEdit && (
          <Link href={`/dashboard/usuarios/${id}/editar`}>
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-0"
            >
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          </Link>
        )}
        {linkedDriver && (
          <Link href={`/dashboard/motoristas/${linkedDriver.id}`}>
            <Button variant="outline" className="flex items-center gap-2 border-zinc-300">
              <Truck className="w-4 h-4" />
              Ver motorista na frota
            </Button>
          </Link>
        )}
        {canDelete && (
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 border-0"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </Button>
        )}
      </div>

      {/* Delete Dialog */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-zinc-900 font-semibold mb-2">Confirmar Exclusão</h3>
            <p className="text-zinc-600 text-sm py-2">
              Tem certeza que deseja remover <strong>{staffDisplayName(member)}</strong> da equipe?
              A conta de login será excluída. O cadastro na frota (se existir) permanece.
              Esta ação não pode ser desfeita.
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
    </div>
  );
}
