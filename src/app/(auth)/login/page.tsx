import { Truck } from 'lucide-react';
import { LoginForm } from '@/components/auth';

export default function LoginPage() {
  return (
    <div className="w-full">
      {/* Logo e título - design do protótipo Figma Make */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Truck className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-zinc-900 text-[1.75rem] font-bold">Truck Finanças</h1>
        <p className="text-zinc-500 mt-1">Gestão de fretes e comissões</p>
      </div>

      <LoginForm />
    </div>
  );
}
