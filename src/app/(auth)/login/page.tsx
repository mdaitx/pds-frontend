import { BrandLogo } from '@/components/brand-logo';
import { LoginForm } from '@/components/auth';

export default function LoginPage() {
  return (
    <div className="w-full">
      {/* Logo e título - design do protótipo Figma Make */}
      <div className="flex flex-col items-center mb-8">
        <div className="mb-4 flex h-36 w-36 items-center justify-center">
          <BrandLogo size={144} priority />
        </div>
        <h1 className="text-zinc-900 text-[1.75rem] font-bold">Truck Finanças</h1>
        <p className="text-zinc-500 mt-1">Gestão de fretes e comissões</p>
      </div>

      <LoginForm />
    </div>
  );
}
