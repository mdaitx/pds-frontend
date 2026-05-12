'use client';

/**
 * Lista de usuários: apenas contas com login (staff).
 * Motoristas cadastrados na frota sem acesso aparecem em Motoristas; aqui só quem tem login.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';
import {
  getCompanyStaff,
  deleteCompanyStaffUser,
  formatPhoneBr,
  type CompanyStaffResponse,
  type CompanyStaffMember,
} from '@/lib';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingMessage } from '@/components/ui/loading';
import { Plus, Search, UserCircle, Shield, Truck as TruckIcon, ArrowLeft, Trash2 } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { dashboardCardDeleteButtonClass, dashboardLinkPrimaryClass } from '@/lib/dashboard-action-buttons';
import { dashboardSearchIconLeftClass } from '@/lib/dashboard-field-classes';
import { cn } from '@/lib/cn';

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
    className:
      'bg-purple-100 text-purple-900 dark:bg-purple-500/22 dark:text-purple-100 [&_svg]:text-purple-700 dark:[&_svg]:text-purple-200',
  },
  ADMIN: {
    label: 'Administrador',
    icon: <Shield className="h-4 w-4" />,
    className:
      'bg-blue-100 text-blue-900 dark:bg-blue-500/22 dark:text-blue-50 [&_svg]:text-blue-700 dark:[&_svg]:text-blue-200',
  },
  DRIVER: {
    label: 'Usuário motorista',
    icon: <TruckIcon className="h-4 w-4" />,
    className:
      'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/22 dark:text-emerald-50 [&_svg]:text-emerald-700 dark:[&_svg]:text-emerald-200',
  },
};

const statusConfig = {
  ACTIVE: {
    label: 'Ativo',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/22 dark:text-emerald-50',
  },
  INACTIVE: { label: 'Inativo', className: 'bg-muted text-muted-foreground' },
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
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserCircle className="h-7 w-7 text-muted-foreground/75" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-foreground" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
          {user.name}
        </h3>
        <p className="truncate text-muted-foreground" style={{ fontSize: '0.8rem' }}>
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
          <p className="mt-2 text-muted-foreground/85" style={{ fontSize: '0.75rem' }}>
            {formatPhoneBr(user.phone ?? '')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, appUser, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ListUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fleetStaff = appUser?.role === 'OWNER' || appUser?.role === 'ADMIN';
  const staffQuery = useQuery({
    queryKey: ['company-staff'],
    queryFn: () => getCompanyStaff(session?.access_token),
    enabled: Boolean(session && appUser && fleetStaff),
    staleTime: 60_000,
    retry: false,
  });

  const staff = useMemo(() => staffQuery.data?.staff ?? [], [staffQuery.data]);
  const loading = Boolean(fleetStaff && staffQuery.isPending && !staffQuery.data);
  const error =
    fleetStaff && staffQuery.isError
      ? staffQuery.error instanceof Error
        ? staffQuery.error.message
        : 'Erro ao carregar'
      : null;

  const users = useMemo(() => staffToUsers(staff), [staff]);

  useEffect(() => {
    if (!session || !appUser) return;
    if (!fleetStaff) {
      router.replace('/dashboard');
    }
  }, [session, appUser, fleetStaff, router]);

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
      queryClient.setQueryData<CompanyStaffResponse>(['company-staff'], (current) =>
        current
          ? {
              ...current,
              staff: current.staff.filter((x) => x.id !== deleteTarget.id),
            }
          : current
      );
      setDeleteTarget(null);
      toast.success('Usuário excluído.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const resolveCard = (user: ListUser) => {
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
        <Card className="h-full border-border p-4 transition-all hover:border-primary/35 hover:shadow-md">
        <UserCardInner user={user} />
        {showExcluir && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(user);
              }}
              className={dashboardCardDeleteButtonClass}
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
      <DashboardPageShell maxWidth="6xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage message="Carregando usuários…" className="text-muted-foreground" />
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell maxWidth="6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              prefetch={false}
              className="mb-1 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao dashboard
            </Link>
            <h1 className="break-words text-xl font-semibold text-foreground md:text-2xl">Usuários</h1>
            <p className="mt-0.5 text-muted-foreground" style={{ fontSize: '0.85rem' }}>
              Contas com login (acesso ao sistema). Motoristas da frota sem acesso ficam em Motoristas.
            </p>
          </div>
          {canInviteNewUsers ? (
            <Link
              href="/dashboard/usuarios/novo"
              prefetch={false}
              className={cn(dashboardLinkPrimaryClass, 'w-full sm:w-auto')}
            >
              <Plus className="h-4 w-4" />
              Novo usuário
            </Link>
          ) : null}
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="relative w-full min-w-0 max-w-full sm:max-w-sm">
          <Search className={dashboardSearchIconLeftClass} />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3 items-stretch">
          <Card className="border-border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/12 ring-1 ring-inset ring-purple-600/20 dark:bg-purple-500/22 dark:ring-purple-400/28">
                <Shield className="h-5 w-5 text-purple-700 dark:text-purple-300" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
                  Proprietários
                </p>
                <p className="text-foreground" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {ownerCount}
                </p>
              </div>
            </div>
          </Card>
          <Card className="border-border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 ring-1 ring-inset ring-primary/20 dark:bg-primary/22 dark:ring-primary/28">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
                  Administradores
                </p>
                <p className="text-foreground" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {adminCount}
                </p>
              </div>
            </div>
          </Card>
          <Card className="border-border p-4 shadow-sm min-[420px]:col-span-2 sm:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 ring-1 ring-inset ring-emerald-600/18 dark:bg-emerald-500/20 dark:ring-emerald-400/28">
                <TruckIcon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
                  Usuários motorista
                </p>
                <p className="text-foreground" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {driverUserCount}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <UserCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            filtered.map((user) => <div key={user.id}>{resolveCard(user)}</div>)
          )}
        </div>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
              <h3 className="mb-2 font-semibold text-foreground">Confirmar exclusão</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Tem certeza que deseja excluir <strong className="text-foreground">{deleteTarget.name}</strong>?
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
                <Button variant="danger" className="w-full sm:w-auto" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </div>
          </div>
        )}
    </DashboardPageShell>
  );
}
