import { Card } from '@/components/ui/card';
import { LoginForm } from '@/components/auth';

export default function LoginPage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold text-zinc-900">Entrar</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Use seu e-mail e senha para acessar.
      </p>
      <LoginForm />
    </Card>
  );
}
