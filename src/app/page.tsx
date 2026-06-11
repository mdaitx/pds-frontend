import type { Metadata } from 'next';
import { AuthenticatedHomeGate, LandingPage } from '@/components/marketing';

export const metadata: Metadata = {
  title: 'Truck Finanças — Gestão de Fretes e Acertos',
  description:
    'Gestão financeira de viagens, despesas, adiantamentos e comissões para motoristas e donos de frota. Teste grátis por 30 dias.',
  openGraph: {
    title: 'Truck Finanças — Gestão de Fretes e Acertos',
    description:
      'Centralize viagens, despesas e acertos — feito para quem vive na estrada.',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <AuthenticatedHomeGate>
      <LandingPage />
    </AuthenticatedHomeGate>
  );
}
