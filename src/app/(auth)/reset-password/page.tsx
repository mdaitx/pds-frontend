import { Suspense } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { LoadingMessage } from '@/components/ui/loading';
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
        <h1 className="text-[1.75rem] font-bold text-foreground">Truck Finanças</h1>
        <p className="mt-1 text-muted-foreground">Gestão de fretes e comissões</p>
      </div>

      <Card className="shadow-xl border-border">
        <CardHeader className="pb-2">
          <h2 className="text-center text-xl font-semibold text-foreground">Nova senha</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Defina uma nova senha após clicar no link do e-mail.
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoadingMessage />}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
