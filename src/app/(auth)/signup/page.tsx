import { BrandLogo } from '@/components/brand-logo';
import { SignupForm } from '@/components/auth';

/**
 * Cadastro — layout alinhado ao protótipo Figma Make (tema claro), mesma faixa visual do login.
 */
export default function SignupPage() {
  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-36 w-36 items-center justify-center">
          <BrandLogo size={144} priority />
        </div>
        <h1 className="text-[1.75rem] font-bold text-zinc-900">Truck Finanças</h1>
        <p className="mt-1 text-zinc-500">Gestão de fretes e comissões</p>
      </div>

      <SignupForm />
    </div>
  );
}
