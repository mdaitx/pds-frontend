import { BrandLogo } from '@/components/brand-logo';
import { LoginForm } from '@/components/auth';

export default function LoginPage() {
  return (
    <div className="relative w-full">
      {/* Logo e título - design do protótipo Figma Make */}
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-36 w-36 items-center justify-center">
          <BrandLogo size={144} priority />
        </div>
        <h1 className="text-[1.75rem] font-bold text-foreground">Truck Finanças</h1>
        <p className="mt-1 text-muted-foreground">Gestão de fretes e comissões</p>
      </div>

      <LoginForm />
    </div>
  );
}
