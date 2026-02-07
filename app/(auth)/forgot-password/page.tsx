import { Card } from '@/components/ui/card';
import { ForgotPasswordForm } from '@/components/auth';

export default function ForgotPasswordPage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold text-zinc-900">Recuperar senha</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Informe seu e-mail para receber o link de redefinição.
      </p>
      <ForgotPasswordForm />
    </Card>
  );
}
