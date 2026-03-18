import { Card } from '@/components/ui/card';
import { SignupForm } from '@/components/auth';

export default function SignupPage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold text-zinc-900">Criar conta</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Preencha os dados para se cadastrar. Use um e-mail real; confira a caixa de entrada (e o spam) após cadastrar.
      </p>
      <SignupForm />
    </Card>
  );
}
