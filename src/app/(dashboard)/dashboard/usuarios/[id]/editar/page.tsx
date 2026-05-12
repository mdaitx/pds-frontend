'use client';

/**
 * Edição de usuário da equipe (ADMIN / co-proprietário) — estrutura igual à de motoristas.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Key, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';
import {
  getCompanyStaff,
  updateCompanyStaffUser,
  deleteCompanyStaffUser,
  type CompanyStaffMember,
} from '@/lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { mobileFormActionsRowClass } from '@/lib/dashboard-mobile';
import {
  dashboardFormDeleteButtonClass,
  dashboardFormSaveButtonClass,
} from '@/lib/dashboard-action-buttons';
import { LoadingMessage } from '@/components/ui/loading';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { dashboardNativeFieldClass } from '@/lib/dashboard-field-classes';

const selectClass = cn(dashboardNativeFieldClass, 'flex h-auto min-h-10 py-2');

export default function EditarUsuarioPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { appUser, session, loading: authLoading } = useAuth();
  const [member, setMember] = useState<CompanyStaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'OWNER' | 'DRIVER'>('ADMIN');
  const [iAmPrimaryOwner, setIAmPrimaryOwner] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (authLoading || !session || !appUser) return;
    if (appUser.role !== 'OWNER' && appUser.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    setLoading(true);
    getCompanyStaff()
      .then((res) => {
        const me = res.staff.find((s) => s.id === appUser.id);
        const primary = !!me?.isPrimaryOwner;
        setIAmPrimaryOwner(primary);
        const m = res.staff.find((s) => s.id === id);
        if (!m) {
          toast.error('Usuário não encontrado.');
          router.replace('/dashboard/usuarios');
          return;
        }
        setMember(m);
        setName(m.name ?? '');
        setRole(m.role === 'OWNER' ? 'OWNER' : m.role === 'DRIVER' ? 'DRIVER' : 'ADMIN');
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Erro ao carregar');
        router.replace('/dashboard/usuarios');
      })
      .finally(() => setLoading(false));
  }, [authLoading, session, appUser, id, router]);

  const targetIsPrimary = member?.isPrimaryOwner ?? false;
  const canEditRole = iAmPrimaryOwner && !targetIsPrimary;
  const canDelete = iAmPrimaryOwner && !targetIsPrimary && member && member.id !== appUser?.id;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    if (newPassword && newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }
    setSaving(true);
    try {
      const payload: { name?: string; role?: 'ADMIN' | 'OWNER' | 'DRIVER'; password?: string } = {};
      const trimmed = name.trim();
      if (trimmed !== (member.name ?? '').trim()) payload.name = trimmed;
      if (canEditRole && role !== member.role) payload.role = role;
      if (newPassword.trim()) payload.password = newPassword.trim();
      if (Object.keys(payload).length === 0) {
        toast.message('Nada para salvar.');
        setSaving(false);
        return;
      }
      await updateCompanyStaffUser(member.id, payload);
      toast.success('Alterações salvas.');
      router.push(`/dashboard/usuarios/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!member || !canDelete) return;
    if (!window.confirm(`Remover ${member.email} da frota? A conta de login será excluída.`)) return;
    setDeleting(true);
    try {
      await deleteCompanyStaffUser(member.id);
      toast.success('Usuário removido.');
      router.push('/dashboard/usuarios');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading || !appUser) {
    return (
      <DashboardPageShell maxWidth="2xl">
        <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 dark:bg-muted/20">
          <LoadingMessage
            message="Carregando dados do usuário…"
            className="text-muted-foreground"
          />
        </div>
      </DashboardPageShell>
    );
  }

  if (!member) return null;

  return (
    <DashboardPageShell maxWidth="2xl">
      <div>
        <Link
          href={`/dashboard/usuarios/${id}`}
          className="mb-1 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar aos detalhes
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Editar Usuário</h1>
        <p className="mt-1 text-sm text-muted-foreground">{member.email}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <h3 className="font-medium text-foreground">Dados do usuário</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="eqName">Nome</Label>
              <Input id="eqName" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {canEditRole ? (
              <div className="space-y-1.5">
                <Label htmlFor="eqRole">Perfil</Label>
                <select
                  id="eqRole"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'ADMIN' | 'OWNER' | 'DRIVER')}
                  className={selectClass}
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="OWNER">Co-proprietário</option>
                  <option value="DRIVER">Motorista</option>
                </select>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Perfil:{' '}
                <strong className="text-foreground">
                  {member.role === 'OWNER' ? 'Co-proprietário' : member.role === 'DRIVER' ? 'Motorista' : 'Administrador'}
                </strong>
                {targetIsPrimary ? ' (titular)' : ''}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <h3 className="flex items-center gap-2 font-medium text-foreground">
              <Key className="h-4 w-4 text-muted-foreground" />
              Trocar senha
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Deixe em branco para manter a senha atual.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="eqNewPassword">Nova senha</Label>
              <Input
                id="eqNewPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eqConfirmPassword">Confirmar nova senha</Label>
              <Input
                id="eqConfirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
            </div>
          </CardContent>
        </Card>

        <div className={mobileFormActionsRowClass}>
          <Button
            type="submit"
            disabled={saving || deleting}
            loading={saving}
            className={dashboardFormSaveButtonClass}
          >
            {!saving && <Save className="h-4 w-4" />}
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
          {canDelete ? (
            <Button
              type="button"
              variant="outline"
              disabled={saving || deleting}
              loading={deleting}
              onClick={handleDelete}
              className={dashboardFormDeleteButtonClass}
            >
              {!deleting && <Trash2 className="h-4 w-4" />}
              {deleting ? 'Excluindo…' : 'Excluir usuário'}
            </Button>
          ) : null}
        </div>
      </form>
    </DashboardPageShell>
  );
}
