import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/marketing/legal-page-layout';
import { TERMS_SECTIONS } from '@/lib/marketing/legal-content';

export const metadata: Metadata = {
  title: 'Termos de Uso — Truck Finanças',
  description: 'Condições de uso do Truck Finanças para motoristas e donos de frota.',
  robots: { index: true, follow: true },
};

export default function TermosPage() {
  return (
    <LegalPageLayout
      title="Termos de Uso"
      description="Regras de uso da plataforma, responsabilidades, planos e limitações aplicáveis."
      updatedAt="10 de junho de 2026"
      sections={TERMS_SECTIONS}
    />
  );
}
