'use client';

/**
 * Cadastro de novo usuário — formulário único para todos os perfis (Proprietário, Administrador, Motorista).
 */
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
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

const selectClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function NovoUsuarioPage() {
  const router = useRouter();
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

    const needsPassword = form.role === 'DRIVER' || !inviteByEmail;
    if (needsPassword) {
      if (!form.password.trim()) {
        errs.password =
          form.role === 'DRIVER'
            ? 'Senha é obrigatória para motorista.'
            : 'Senha é obrigatória (ou marque convite por e-mail).';
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
        password: role === 'DRIVER' ? form.password : inviteByEmail ? undefined : form.password,
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
      router.push('/dashboard/usuarios');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <LoadingMessage />
      </div>
    );
  }

  if (isAdminUser) return null;

  return (
    <DashboardPageShell maxWidth="2xl">
      <div>
        <Link
          href="/dashboard/usuarios"
          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-700 transition-colors mb-1"
          style={{ fontSize: '0.85rem' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar aos usuários
        </Link>
        <h1 className="text-zinc-900 text-xl font-semibold">Novo Usuário</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h3 className="text-zinc-700 font-medium">Dados Pessoais</h3>
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
                <p className="text-zinc-500 text-xs">
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
              {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
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
              {errors.email && <p className="text-red-600 text-sm">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Senha *
                {form.role !== 'DRIVER' && canInviteStaff && (
                  <span className="text-zinc-500 text-xs ml-1">(ou convite por e-mail)</span>
                )}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                autoComplete="new-password"
                disabled={form.role !== 'DRIVER' && inviteByEmail}
              />
              {errors.password && <p className="text-red-600 text-sm">{errors.password}</p>}
            </div>
            {form.role !== 'DRIVER' && canInviteStaff && (
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-white p-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={inviteByEmail}
                  onChange={(e) => {
                    setInviteByEmail(e.target.checked);
                    setErrors((er) => ({ ...er, password: '' }));
                  }}
                />
                <span className="text-sm text-zinc-700">
                  Convidar por e-mail — sem definir senha agora. O Supabase envia um link.
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

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h3 className="text-zinc-700 font-medium">Permissões e Acesso</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-900 text-sm font-semibold mb-1">
                Restrições de Acesso por Perfil
              </p>
              <ul className="text-blue-800 text-xs space-y-1 ml-4 list-disc">
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
                <p className="text-zinc-500 text-xs mt-1">
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
                <p className="text-zinc-500 text-xs mt-1">
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
            className="flex w-full items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
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
