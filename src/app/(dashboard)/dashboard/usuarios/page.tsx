'use client';

/**
 * Lista de usuários: apenas contas com login (staff).
 * Motoristas cadastrados na frota sem acesso aparecem em Motoristas; aqui só quem tem login.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';
import {
  getCompanyStaff,
  deleteCompanyStaffUser,
  type AuthUser,
  type CompanyStaffMember,
} from '@/lib';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, UserCircle, Shield, Truck as TruckIcon, ArrowLeft, Trash2 } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

type UserRole = 'OWNER' | 'ADMIN' | 'DRIVER';

type ListUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photo: string | null;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  isPrimaryOwner?: boolean;
};

const roleConfig: Record<
  UserRole,
  { label: string; icon: ReactNode; className: string }
> = {
  OWNER: {
    label: 'Proprietário',
    icon: <Shield className="h-4 w-4" />,
    className: 'bg-purple-100 text-purple-800',
  },
  ADMIN: {
    label: 'Administrador',
    icon: <Shield className="h-4 w-4" />,
    className: 'bg-blue-100 text-blue-800',
  },
  DRIVER: {
    label: 'Usuário motorista',
    icon: <TruckIcon className="h-4 w-4" />,
    className: 'bg-green-100 text-green-800',
  },
};

const statusConfig = {
  ACTIVE: { label: 'Ativo', className: 'bg-green-100 text-green-800' },
  INACTIVE: { label: 'Inativo', className: 'bg-zinc-100 text-zinc-600' },
};

function staffDisplayName(m: CompanyStaffMember): string {
  if (m.name?.trim()) return m.name.trim();
  const local = m.email?.split('@')[0];
  return local || m.email;
}

function staffToUsers(staff: CompanyStaffMember[]): ListUser[] {
  return staff.map((m) => ({
    id: m.id,
    name: staffDisplayName(m),
    email: m.email,
    phone: m.phone ?? null,
    photo: m.photoUrl ?? null,
    role: (m.role === 'ADMIN' || m.role === 'OWNER' ? m.role : m.role === 'DRIVER' ? 'DRIVER' : 'OWNER') as UserRole,
    status: 'ACTIVE' as const,
    isPrimaryOwner: m.isPrimaryOwner,
  }));
}

function UserCardInner({ user }: { user: ListUser }) {
  return (
    <div className="flex items-start gap-3">
      {user.photo ? (
        <Image
          src={user.photo}
          alt={user.name}
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100">
          <UserCircle className="h-7 w-7 text-zinc-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-zinc-900" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
          {user.name}
        </h3>
        <p className="truncate text-zinc-500" style={{ fontSize: '0.8rem' }}>
          {user.email || '—'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${roleConfig[user.role].className}`}
          >
            {roleConfig[user.role].icon}
            {roleConfig[user.role].label}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${statusConfig[user.status].className}`}>
            {statusConfig[user.status].label}
          </span>
        </div>
        {user.phone ? (
          <p className="mt-2 text-zinc-400" style={{ fontSize: '0.75rem' }}>
            {user.phone}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const router = useRouter();
  const { session, appUser, loading: authLoading } = useAuth();
  const [staff, setStaff] = useState<CompanyStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ListUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const users = useMemo(() => staffToUsers(staff), [staff]);

  useEffect(() => {
    if (!session || !appUser) return;
    if (appUser.role !== 'OWNER' && appUser.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    setLoading(true);
    getCompanyStaff()
      .then((s) => {
        setStaff(s.staff);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [session, appUser, router]);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const ownerCount = users.filter((u) => u.role === 'OWNER').length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const driverUserCount = users.filter((u) => u.role === 'DRIVER').length;

  const appIsPrimaryOwner = !!staff.find((s) => s.id === appUser?.id)?.isPrimaryOwner;
  const canInviteNewUsers = appUser?.role === 'OWNER' && appIsPrimaryOwner;

  const canDelete = (user: ListUser) =>
    appUser?.role === 'OWNER' &&
    appIsPrimaryOwner &&
    !user.isPrimaryOwner &&
    user.id !== appUser?.id;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCompanyStaffUser(deleteTarget.id);
      setStaff((s) => s.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success('Usuário excluído.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const resolveCard = (user: ListUser, app: AuthUser | null) => {
    const detalhesHref = `/dashboard/usuarios/${user.id}`;
    const showExcluir = canDelete(user);

    return (
      <div
        className="h-full cursor-pointer"
        onClick={() => router.push(detalhesHref)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            router.push(detalhesHref);
          }
        }}
      >
        <Card className="h-full border-zinc-200 p-4 transition-all hover:border-blue-300 hover:shadow-md">
        <UserCardInner user={user} />
        {showExcluir && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(user);
              }}
              className="justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border-0 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </Button>
          </div>
        )}
        </Card>
      </div>
    );
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
              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-700 transition-colors mb-1 text-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao dashboard
            </Link>
            <h1 className="break-words text-xl font-semibold text-zinc-900 md:text-2xl">Usuários</h1>
            <p className="mt-0.5 text-zinc-500" style={{ fontSize: '0.85rem' }}>
              Contas com login (acesso ao sistema). Motoristas da frota sem acesso ficam em Motoristas.
            </p>
          </div>
          {canInviteNewUsers ? (
            <Link
              href="/dashboard/usuarios/novo"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Novo usuário
            </Link>
          ) : null}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="relative w-full min-w-0 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3 items-stretch">
          <Card className="border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-zinc-500" style={{ fontSize: '0.78rem' }}>
                  Proprietários
                </p>
                <p className="text-zinc-900" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {ownerCount}
                </p>
              </div>
            </div>
          </Card>
          <Card className="border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-zinc-500" style={{ fontSize: '0.78rem' }}>
                  Administradores
                </p>
                <p className="text-zinc-900" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {adminCount}
                </p>
              </div>
            </div>
          </Card>
          <Card className="border-zinc-200 p-4 min-[420px]:col-span-2 sm:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <TruckIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-zinc-500" style={{ fontSize: '0.78rem' }}>
                  Usuários motorista
                </p>
                <p className="text-zinc-900" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {driverUserCount}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <UserCircle className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
              <p className="text-zinc-500">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            filtered.map((user) => <div key={user.id}>{resolveCard(user, appUser)}</div>)
          )}
        </div>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <h3 className="mb-2 font-semibold text-zinc-900">Confirmar exclusão</h3>
              <p className="mb-4 text-sm text-zinc-600">
                Tem certeza que deseja excluir <strong>{deleteTarget.name}</strong>?
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
