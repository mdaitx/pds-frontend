import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { ResetPasswordForm } from '@/components/auth';

export default function ResetPasswordPage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold text-zinc-900">Nova senha</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Defina uma nova senha após clicar no link do e-mail.
      </p>
      <Suspense fallback={<p className="mt-6 text-zinc-500">Carregando…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </Card>
  );
}
