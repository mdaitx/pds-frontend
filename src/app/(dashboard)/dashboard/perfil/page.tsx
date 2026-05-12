'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, CircleUserRound, KeyRound } from 'lucide-react';
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
import { dashboardFormSaveButtonClass } from '@/lib/dashboard-action-buttons';
import { cn } from '@/lib/cn';

const ROLE_LABEL: Record<AuthUser['role'], string> = {
  OWNER: 'Dono da frota',
  DRIVER: 'Motorista',
  ADMIN: 'Administrador',
};

const MIN_PASSWORD_LEN = 6;

const labelClass = 'text-sm font-medium leading-none text-foreground';

function withCacheBust(url: string, token: number): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(String(token))}`;
}

/** Mesmo padrão de ficha da tela de viagem (motorista). */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-border py-3 last:border-0 sm:grid-cols-[minmax(7rem,11rem)_1fr] sm:gap-4 sm:py-2.5">
      <dt className="text-[0.8rem] font-medium text-muted-foreground">{label}</dt>
      <dd className="text-[0.88rem] text-foreground">{children}</dd>
    </div>
  );
}

/** Mesmo bloco de título dos cards de Configurações (ícone + h3 + subtítulo). */
function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 rounded-lg bg-primary/12 p-2 text-primary ring-1 ring-primary/18 dark:bg-primary/18 dark:ring-primary/25">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <h3 className="text-foreground" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          {title}
        </h3>
        <p className="mt-0.5 leading-snug text-muted-foreground" style={{ fontSize: '0.8rem' }}>
          {description}
        </p>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  const { appUser, loading, refreshAppUser, configError } = useAuth();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoMarkedForRemoval, setPhotoMarkedForRemoval] = useState(false);
  const [committedPhotoUrl, setCommittedPhotoUrl] = useState<string | null | undefined>(undefined);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [photoVersion, setPhotoVersion] = useState<number>(Date.now());
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const isDriver = appUser?.role === 'DRIVER';

  const canSavePassword =
    newPassword.length >= MIN_PASSWORD_LEN &&
    confirmPassword.length >= MIN_PASSWORD_LEN &&
    newPassword === confirmPassword;

  const persistedPhotoUrl = committedPhotoUrl !== undefined ? committedPhotoUrl : (appUser?.photoUrl ?? null);
  const displayPhoto = photoMarkedForRemoval
    ? null
    : (previewUrl ?? (persistedPhotoUrl ? withCacheBust(persistedPhotoUrl, photoVersion) : null));

  const handlePhotoChange = useCallback(
    (file: File | null, preview: string | null) => {
      setPreviewUrl((current) => {
        if (current?.startsWith('blob:') && current !== preview) {
          URL.revokeObjectURL(current);
        }
        return preview;
      });
      setSelectedPhotoFile(file);
      setPhotoMarkedForRemoval(!file && !preview);
      setPhotoDirty(true);
      if (configError) {
        toast.error(configError);
      }
    },
    [configError]
  );

  const handlePhotoSave = useCallback(async () => {
    if (!photoDirty) return;
    if (configError) {
      toast.error(configError);
      return;
    }
    setPhotoBusy(true);
    try {
      if (selectedPhotoFile) {
        const updatedProfile = await uploadAuthProfilePhoto(selectedPhotoFile);
        setCommittedPhotoUrl(updatedProfile.photoUrl ?? null);
      } else {
        await patchAuthProfile({ photoUrl: null });
        setCommittedPhotoUrl(null);
      }
      await refreshAppUser();
      setPreviewUrl((current) => {
        if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
        return null;
      });
      setSelectedPhotoFile(null);
      setPhotoMarkedForRemoval(false);
      setPhotoDirty(false);
      setPhotoVersion(Date.now());
      toast.success(selectedPhotoFile ? 'Foto atualizada' : 'Foto removida');
    } catch (e) {
      if (!selectedPhotoFile) {
        setPhotoMarkedForRemoval(false);
      }
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar a foto');
    } finally {
      setPhotoBusy(false);
    }
  }, [configError, photoDirty, refreshAppUser, selectedPhotoFile]);

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
    <DashboardPageShell
      className="settings-font-inter tracking-tight"
      maxWidth="3xl"
    >
      <div className="min-w-0 space-y-5 sm:space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 flex items-center gap-1.5 text-[0.85rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {isDriver ? 'Painel' : 'Dashboard'}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words text-foreground antialiased" style={{ fontSize: '1.35rem', fontWeight: 600 }}>
              Perfil
            </h1>
            {appUser && (
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold',
                  isDriver
                    ? 'bg-sky-500/18 text-sky-950 ring-1 ring-sky-500/25 dark:bg-sky-500/22 dark:text-sky-50 dark:ring-sky-400/30'
                    : 'bg-muted text-muted-foreground ring-1 ring-border/60'
                )}
              >
                {ROLE_LABEL[appUser.role]}
              </span>
            )}
          </div>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {isDriver
              ? 'Foto, senha e dados da sua conta. As alterações valem para o app e para o que a frota enxerga do seu usuário.'
              : 'Foto da conta, senha e dados básicos do usuário.'}
          </p>
        </div>

        {configError ? (
          <div
            className="rounded-xl border border-amber-500/35 bg-amber-500/[0.12] px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/35 dark:text-amber-50"
            role="status"
          >
            {configError}
          </div>
        ) : null}

        <Card className="rounded-xl border-border bg-card shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <SectionHeader
              icon={Camera}
              title="Foto do perfil"
              description="JPEG, PNG ou WebP. Aparece no menu e nas telas em que o sistema mostra seu usuário."
            />
          </CardHeader>
          <CardContent className="pb-6">
            {loading || !appUser ? (
              <LoadingMessage className="text-muted-foreground" />
            ) : (
              <div className={cn(photoBusy && 'pointer-events-none opacity-70')}>
                <div className="[&_.relative]:h-20 [&_.relative]:w-20 sm:[&_.relative]:h-24 sm:[&_.relative]:w-24">
                  <ImageUpload
                    label=""
                    value={displayPhoto}
                    onChange={handlePhotoChange}
                    disabled={photoBusy}
                  />
                </div>
                <div className="mt-4 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-relaxed text-muted-foreground sm:max-w-md">
                    {photoDirty
                      ? 'Imagem alterada. Use Salvar para aplicar no servidor.'
                      : 'Toque na área da foto para trocar ou remover. Depois confirme com Salvar.'}
                  </p>
                  <Button
                    type="button"
                    onClick={handlePhotoSave}
                    disabled={photoBusy || !photoDirty || !!configError}
                    loading={photoBusy}
                    className={dashboardFormSaveButtonClass}
                  >
                    {photoBusy ? 'Salvando…' : 'Salvar imagem'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border bg-card shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <SectionHeader
              icon={KeyRound}
              title="Alterar senha"
              description="Digite a nova senha duas vezes. Você permanece logado após a troca."
            />
          </CardHeader>
          <CardContent className="pb-6 text-sm text-foreground">
            <form
              onSubmit={handlePasswordSubmit}
              className={cn(passwordBusy && 'pointer-events-none opacity-70')}
            >
              <div className="mx-auto max-w-md space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="perfil-nova-senha" className={labelClass}>
                    Nova senha
                  </Label>
                  <Input
                    id="perfil-nova-senha"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={passwordBusy || !!configError}
                    minLength={MIN_PASSWORD_LEN}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perfil-confirmar-senha" className={labelClass}>
                    Confirmar nova senha
                  </Label>
                  <Input
                    id="perfil-confirmar-senha"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={passwordBusy || !!configError}
                    minLength={MIN_PASSWORD_LEN}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-relaxed text-muted-foreground sm:max-w-md">
                  {canSavePassword
                    ? 'Pronto para salvar. Você permanece logado após a troca.'
                    : `Preencha os dois campos com a mesma senha (mín. ${MIN_PASSWORD_LEN} caracteres). O botão libera automaticamente.`}
                </p>
                <Button
                  type="submit"
                  disabled={passwordBusy || !!configError || !canSavePassword}
                  loading={passwordBusy}
                  className={dashboardFormSaveButtonClass}
                >
                  {passwordBusy ? 'Salvando…' : 'Salvar senha'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border bg-card shadow-sm">
          <CardHeader className="pb-2 pt-6">
            <SectionHeader
              icon={CircleUserRound}
              title="Conta"
              description="Somente leitura — definições da organização vêm do gestor da frota."
            />
          </CardHeader>
          <CardContent className="pb-6 text-sm text-foreground">
            {loading || !appUser ? (
              <LoadingMessage className="text-muted-foreground" />
            ) : (
              <dl>
                <DetailRow label="E-mail">
                  <span className="break-all font-medium">{appUser.email}</span>
                </DetailRow>
                <DetailRow label="Papel">
                  <span className="font-medium">{ROLE_LABEL[appUser.role]}</span>
                </DetailRow>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  );
}
