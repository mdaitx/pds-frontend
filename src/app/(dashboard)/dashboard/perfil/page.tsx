'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';
import { createClient } from '@/lib/supabase';
import {
  patchAuthProfile,
  uploadAuthProfilePhoto,
  type AuthUser,
} from '@/lib';
import { Card, CardContent, CardHeader, LoadingMessage } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { dashboardLinkMutedNavClass } from '@/lib/dashboard-action-buttons';
import { dashboardFormSaveButtonClass } from '@/lib/dashboard-action-buttons';

const ROLE_LABEL: Record<AuthUser['role'], string> = {
  OWNER: 'Dono da frota',
  DRIVER: 'Motorista',
  ADMIN: 'Administrador',
};

const MIN_PASSWORD_LEN = 6;

export default function PerfilPage() {
  const { appUser, loading, refreshAppUser, configError } = useAuth();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const displayPhoto = previewUrl ?? appUser?.photoUrl ?? null;

  const handlePhotoChange = useCallback(
    async (file: File | null, preview: string | null) => {
      setPreviewUrl(preview);
      if (configError) {
        toast.error(configError);
        return;
      }
      if (!file) {
        setPhotoBusy(true);
        try {
          await patchAuthProfile({ photoUrl: null });
          await refreshAppUser();
          toast.success('Foto removida');
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Não foi possível remover a foto');
        } finally {
          setPhotoBusy(false);
        }
        return;
      }
      setPhotoBusy(true);
      try {
        await uploadAuthProfilePhoto(file);
        await refreshAppUser();
        setPreviewUrl(null);
        toast.success('Foto atualizada');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao enviar a foto');
        setPreviewUrl(null);
      } finally {
        setPhotoBusy(false);
      }
    },
    [configError, refreshAppUser]
  );

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LEN) {
      toast.error(`A senha deve ter pelo menos ${MIN_PASSWORD_LEN} caracteres`);
      return;
    }
    if (configError) {
      toast.error(configError);
      return;
    }
    setPasswordBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Senha alterada com sucesso');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar a senha');
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <DashboardPageShell maxWidth="2xl">
      <div className="min-w-0 space-y-4">
        <div>
          <h1 className="break-words text-xl font-semibold text-zinc-900">Perfil</h1>
          <p className="text-sm text-zinc-500">Foto da conta, senha e dados básicos.</p>
        </div>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                <User className="h-5 w-5 text-zinc-600" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-zinc-900">Foto do perfil</h2>
                <p className="text-sm text-zinc-500">JPEG, PNG ou WebP. Visível na sua conta.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading || !appUser ? (
              <LoadingMessage />
            ) : (
              <div className={photoBusy ? 'pointer-events-none opacity-70' : ''}>
                <ImageUpload
                  label=""
                  value={displayPhoto}
                  onChange={handlePhotoChange}
                  disabled={photoBusy}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h2 className="text-base font-semibold text-zinc-900">Alterar senha</h2>
            <p className="text-sm text-zinc-500">
              Informe a nova senha duas vezes. Você continua logado após a troca.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="perfil-nova-senha">Nova senha</Label>
                <Input
                  id="perfil-nova-senha"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordBusy || !!configError}
                  minLength={MIN_PASSWORD_LEN}
                  className="border-zinc-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perfil-confirmar-senha">Confirmar nova senha</Label>
                <Input
                  id="perfil-confirmar-senha"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordBusy || !!configError}
                  minLength={MIN_PASSWORD_LEN}
                  className="border-zinc-300"
                />
              </div>
              <Button
                type="submit"
                disabled={passwordBusy || !!configError}
                loading={passwordBusy}
                className={dashboardFormSaveButtonClass}
              >
                {passwordBusy ? 'Salvando…' : 'Salvar nova senha'}
              </Button>
            </form>
            <p className="mt-4 text-sm text-zinc-500">
              Perdeu o acesso?{' '}
              <Link href="/forgot-password" className={dashboardLinkMutedNavClass}>
                Recuperar por e-mail
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h2 className="text-base font-semibold text-zinc-900">Conta</h2>
            <p className="text-sm text-zinc-500">Informações do seu usuário</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading || !appUser ? (
              <LoadingMessage />
            ) : (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-zinc-500">E-mail</dt>
                  <dd className="mt-0.5 font-medium text-zinc-900 break-all">{appUser.email}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Papel</dt>
                  <dd className="mt-0.5 font-medium text-zinc-900">{ROLE_LABEL[appUser.role]}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  );
}
