import { Truck } from 'lucide-react';
import { SignupForm } from '@/components/auth';

/**
 * Cadastro — layout alinhado ao protótipo Figma Make (tema claro), mesma faixa visual do login.
 */
export default function SignupPage() {
  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
          <Truck className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-[1.75rem] font-bold text-zinc-900">Truck Finanças</h1>
        <p className="mt-1 text-zinc-500">Gestão de fretes e comissões</p>
      </div>

      <SignupForm />
    </div>
  );
}
