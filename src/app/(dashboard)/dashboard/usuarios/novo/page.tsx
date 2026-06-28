'use client';

/**
 * Cadastro de novo usuário — formulário único para todos os perfis (Proprietário, Administrador, Motorista).
 */
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Save, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';
import {
  createCompanyStaffUser,
  getCompanyStaff,
  getDrivers,
  uploadDriverPhoto,
  digitsOnly,
  formatPhoneBr,
} from '@/lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoadingMessage } from '@/components/ui/loading';
import { ImageUpload } from '@/components/ui/image-upload';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { mobileFormActionsRowClass } from '@/lib/dashboard-mobile';
import { dashboardNativeFieldClass } from '@/lib/dashboard-field-classes';
import { cn } from '@/lib/cn';

const selectClass = cn(dashboardNativeFieldClass, 'flex h-auto min-h-10 py-2');

export default function NovoUsuarioPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const driverIdFromUrl = searchParams.get('driverId');
  const { session, appUser, loading: authLoading } = useAuth();
  const [drivers, setDrivers] = useState<Awaited<ReturnType<typeof getDrivers>>>([]);
  const [staffEmails, setStaffEmails] = useState<Set<string>>(new Set());
  const [canInviteStaff, setCanInviteStaff] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DRIVER' as 'OWNER' | 'ADMIN' | 'DRIVER',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    phone: '',
  });
  const [linkedDriverId, setLinkedDriverId] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [inviteByEmail, setInviteByEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isAdminUser = appUser?.role === 'ADMIN';

  const handlePhotoChange = async (file: File | null, preview: string | null) => {
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    setPhotoPreview(preview);
    setErrors((e) => ({ ...e, photo: '' }));
    try {
      const { url } = await uploadDriverPhoto(file);
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
      setPhotoPreview(url ?? null);
    } catch (err) {
      setPhotoPreview(null);
      toast.error(err instanceof Error ? err.message : 'Não foi possível enviar a foto.');
    }
  };

  const setField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [authLoading, session, router]);

  useEffect(() => {
    if (appUser?.role !== 'OWNER' && appUser?.role !== 'ADMIN') {
      if (appUser) router.replace('/dashboard');
      return;
    }
    if (isAdminUser) {
      router.replace('/dashboard/usuarios');
      return;
    }
    Promise.all([getDrivers(), getCompanyStaff()])
      .then(([d, staffRes]) => {
        setDrivers(d);
        setStaffEmails(new Set(staffRes.staff.map((s) => s.email.trim().toLowerCase())));
        const me = staffRes.staff.find((s) => s.id === appUser?.id);
        const primary = !!me?.isPrimaryOwner;
        setCanInviteStaff(primary);
        if (appUser?.role === 'OWNER' && !primary) {
          router.replace('/dashboard/usuarios');
          return;
        }
        if (driverIdFromUrl) {
          const driver = d.find((x) => x.id === driverIdFromUrl);
          const emailNorm = (driver?.email ?? '').trim().toLowerCase();
          if (driver && emailNorm && !staffRes.staff.some((s) => s.email.trim().toLowerCase() === emailNorm)) {
            setForm((f) => ({
              ...f,
              role: 'DRIVER',
              name: driver.name,
              email: driver.email ?? '',
              phone: formatPhoneBr(driver.phone ?? ''),
            }));
            setLinkedDriverId(driver.id);
            setPhotoPreview(driver.photoUrl ?? null);
          }
        }
      })
      .catch(() => {});
  }, [appUser, isAdminUser, router, driverIdFromUrl]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório.';
    if (!form.email.trim()) errs.email = 'E-mail é obrigatório.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'E-mail inválido.';

    const emailNorm = form.email.trim().toLowerCase();
    if (staffEmails.has(emailNorm)) errs.email = 'Já existe uma conta com este e-mail.';

    const needsPassword = !inviteByEmail;
    if (needsPassword) {
      if (!form.password.trim()) {
        errs.password = 'Senha é obrigatória (ou marque convite por e-mail).';
      } else if (form.password.length < 6) {
        errs.password = 'A senha deve ter no mínimo 6 caracteres.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const role = linkedDriverId ? 'DRIVER' : form.role;
      const res = await createCompanyStaffUser({
        email: form.email.trim(),
        password: inviteByEmail ? undefined : form.password.trim() || undefined,
        role,
        name: form.name.trim(),
        phone: digitsOnly(form.phone) || undefined,
        status: form.status,
        photoUrl: photoPreview?.startsWith('http') ? photoPreview : undefined,
        ...(role === 'DRIVER' && linkedDriverId && { driverId: linkedDriverId }),
      });
      if (res.invitedByEmail) {
        toast.success(
          'Convite enviado por e-mail. O usuário definirá a senha pelo link recebido.'
        );
      } else {
        toast.success(
          role === 'DRIVER'
            ? 'Usuário motorista cadastrado. Credenciais de acesso criadas.'
            : role === 'OWNER'
              ? 'Co-proprietário criado. Ele já pode entrar com e-mail e senha.'
              : 'Administrador criado.'
        );
      }
      await queryClient.invalidateQueries({ queryKey: ['company-staff'] });
      router.push('/dashboard/usuarios');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !session) {
    return (
      <DashboardPageShell maxWidth="2xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage className="text-muted-foreground" />
        </div>
      </DashboardPageShell>
    );
  }

  if (isAdminUser) return null;

  return (
    <DashboardPageShell maxWidth="2xl">
      <div>
        <Link
          href="/dashboard/usuarios"
          className="mb-3 flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          style={{ fontSize: '0.85rem' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar aos usuários
        </Link>
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-blue-500/12 text-blue-700 shadow-sm ring-1 ring-blue-600/15 dark:bg-blue-500/20 dark:text-blue-200 dark:ring-blue-400/25 [&_svg]:text-blue-700 dark:[&_svg]:text-blue-200">
            <UserPlus className="h-7 w-7" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Novo usuário</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Convide alguém com login (motorista, administrador ou coproprietário)
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <h3 className="font-medium text-foreground">Dados Pessoais</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.role === 'DRIVER' && (
              <div className="space-y-1.5">
                <Label htmlFor="linkedDriver">Vincular a motorista da frota</Label>
                <select
                  id="linkedDriver"
                  value={linkedDriverId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setLinkedDriverId(id);
                    const d = drivers.find((x) => x.id === id);
                    if (d) {
                      setForm((f) => ({
                        ...f,
                        role: 'DRIVER',
                        name: d.name,
                        email: d.email ?? '',
                        phone: formatPhoneBr(d.phone ?? ''),
                      }));
                      setPhotoPreview(d.photoUrl ?? null);
                    } else {
                      setForm((f) => ({ ...f, name: '', email: '', phone: '' }));
                      setPhotoPreview(null);
                    }
                  }}
                  className={selectClass}
                  style={{ fontSize: '0.9rem' }}
                >
                  <option value="">Nenhum — criar conta para pessoa nova</option>
                  {drivers
                    .filter((d) => {
                      if (d.userId) return false;
                      const emailNorm = (d.email ?? '').trim().toLowerCase();
                      if (emailNorm && staffEmails.has(emailNorm)) return false;
                      return true;
                    })
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                        {d.email ? ` (${d.email})` : ' (sem e-mail)'}
                      </option>
                    ))}
                </select>
                <p className="text-muted-foreground text-xs">
                  Motorista cadastrado na frota ainda sem conta de acesso. Selecionando, os dados são preenchidos automaticamente.
                </p>
              </div>
            )}
            <ImageUpload
              label="Foto de perfil"
              value={photoPreview ?? undefined}
              onChange={handlePhotoChange}
              disabled={loading}
            />
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                placeholder="Nome do usuário"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
              {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userEmail">E-mail *</Label>
              <Input
                id="userEmail"
                type="email"
                placeholder="usuario@email.com"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
              />
              {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Senha *
                {canInviteStaff && (
                  <span className="text-muted-foreground ml-1 text-xs">(ou convite por e-mail)</span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  autoComplete="new-password"
                  disabled={inviteByEmail}
                  className="pr-10"
                />
                {!inviteByEmail && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
            </div>
            {canInviteStaff && (
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-card p-3">
                <input
                  type="checkbox"
                  className="border-border mt-1 accent-primary"
                  checked={inviteByEmail}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setInviteByEmail(checked);
                    if (checked) setShowPassword(false);
                    setErrors((er) => ({ ...er, password: '' }));
                  }}
                />
                <span className="text-foreground text-sm">
                  Convidar por e-mail — sem definir senha agora. Enviar link via email.
                </span>
              </label>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                inputMode="tel"
                autoComplete="tel"
                maxLength={16}
                value={form.phone}
                onChange={(e) => setField('phone', formatPhoneBr(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <h3 className="font-medium text-foreground">Permissões e Acesso</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-blue-600/28 bg-blue-500/12 p-3 dark:bg-blue-500/16">
              <p className="mb-1 text-sm font-semibold text-blue-950 dark:text-blue-50">
                Restrições de Acesso por Perfil
              </p>
              <ul className="ml-4 list-disc space-y-1 text-xs text-blue-900 dark:text-blue-100/95">
                <li>
                  <strong>Proprietário:</strong> Acesso total ao sistema, incluindo gestão de
                  usuários, configurações e relatórios financeiros.
                </li>
                <li>
                  <strong>Administrador:</strong> Pode gerenciar viagens, veículos, motoristas e
                  visualizar relatórios (sem acesso a configurações).
                </li>
                <li>
                  <strong>Motorista:</strong> Acesso limitado apenas às suas próprias viagens,
                  despesas e adiantamentos.
                </li>
              </ul>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="role">Perfil de acesso *</Label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) => {
                    const newRole = e.target.value as 'OWNER' | 'ADMIN' | 'DRIVER';
                    setField('role', newRole);
                    if (newRole !== 'DRIVER') setLinkedDriverId('');
                  }}
                  className={selectClass}
                  style={{ fontSize: '0.9rem' }}
                  disabled={!canInviteStaff && form.role === 'OWNER'}
                >
                  <option value="OWNER" disabled={!canInviteStaff}>
                    Proprietário
                  </option>
                  <option value="ADMIN">Administrador</option>
                  <option value="DRIVER">Usuário motorista</option>
                </select>
                <p className="text-muted-foreground mt-1 text-xs">
                  {form.role === 'OWNER' && 'Acesso total ao sistema, incluindo configurações.'}
                  {form.role === 'ADMIN' && 'Pode gerenciar viagens, veículos e motoristas.'}
                  {form.role === 'DRIVER' && 'Conta de acesso para motorista da frota. Pode vincular a um motorista já cadastrado ou criar novo.'}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="userStatus">Status</Label>
                <select
                  id="userStatus"
                  value={form.status}
                  onChange={(e) =>
                    setField('status', e.target.value as 'ACTIVE' | 'INACTIVE')
                  }
                  className={selectClass}
                  style={{ fontSize: '0.9rem' }}
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
                <p className="text-muted-foreground mt-1 text-xs">
                  Usuários inativos não poderão fazer login no sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={`${mobileFormActionsRowClass} mt-6`}>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/usuarios')}
            disabled={loading}
            type="button"
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={loading}
            loading={loading}
            type="submit"
          >
            {!loading && <Save className="w-4 h-4" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </DashboardPageShell>
  );
}
