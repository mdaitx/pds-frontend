import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/marketing/legal-page-layout';
import { PRIVACY_SECTIONS } from '@/lib/marketing/legal-content';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Truck Finanças',
  description: 'Como o Truck Finanças coleta, usa e protege seus dados pessoais.',
  robots: { index: true, follow: true },
};

export default function PrivacidadePage() {
  return (
    <LegalPageLayout
      title="Política de Privacidade"
      description="Transparência sobre quais dados tratamos, por quê e quais são seus direitos enquanto titular."
      updatedAt="10 de junho de 2026"
      sections={PRIVACY_SECTIONS}
    />
  );
}
