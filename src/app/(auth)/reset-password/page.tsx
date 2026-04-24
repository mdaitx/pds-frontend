import { Suspense } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ResetPasswordForm } from '@/components/auth';

/**
 * Mesma faixa visual do login / cadastro (protótipo Figma Make).
 */
export default function ResetPasswordPage() {
  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-36 w-36 items-center justify-center">
          <BrandLogo size={144} priority />
        </div>
        <h1 className="text-[1.75rem] font-bold text-zinc-900">Truck Finanças</h1>
        <p className="mt-1 text-zinc-500">Gestão de fretes e comissões</p>
      </div>

      <Card className="shadow-xl border-zinc-200">
        <CardHeader className="pb-2">
          <h2 className="text-center text-xl font-semibold text-zinc-800">Nova senha</h2>
          <p className="mt-1 text-center text-sm text-zinc-500">
            Defina uma nova senha após clicar no link do e-mail.
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-center text-sm text-zinc-500">Carregando…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
