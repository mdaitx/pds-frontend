/** Conteúdo estático da landing — espelha subscription-plans.ts do backend. */
import { LEGAL_CONTACT_EMAIL } from '@/lib/marketing/legal-content';

export const TRIAL_DAYS = 30;
export const TRIAL_MAX_VEHICLES = 3;

export const NAV_LINKS = [
  { href: '/#recursos', label: 'Recursos' },
  { href: '/#app', label: 'App' },
  { href: '/#planos', label: 'Planos' },
  { href: '/#faq', label: 'FAQ' },
] as const;

export const FOOTER_LEGAL_LINKS = [
  { href: '/privacidade', label: 'Privacidade' },
  { href: '/termos', label: 'Termos de uso' },
] as const;

export const FEATURES = [
  {
    title: 'Acerto automático',
    description:
      'Ao finalizar a viagem, despesas, adiantamentos e comissão entram no cálculo — você vê quanto pagar ao motorista e quanto ficou na operação.',
    icon: 'settlement',
  },
  {
    title: 'Viagens com histórico',
    description:
      'Origem, destino, frete, km e status em um só lugar. Consulte por viagem, veículo ou motorista quando precisar conferir.',
    icon: 'truck',
  },
  {
    title: 'Comprovante quando importa',
    description:
      'Despesas acima de R$ 100 pedem foto no app. Regra simples, visível para dono e motorista — menos discussão no fechamento.',
    icon: 'receipt',
  },
  {
    title: 'Dois perfis, um sistema',
    description:
      'Dono gerencia frota, equipe e relatórios. Motorista lança gastos na estrada e acompanha o acerto da viagem.',
    icon: 'users',
  },
  {
    title: 'PWA na estrada',
    description:
      'Adicione à tela inicial do celular e abra como app — mesma conta, mesmo histórico, sem instalar da loja.',
    icon: 'mobile',
  },
  {
    title: 'Infraestrutura confiável',
    description:
      'Autenticação Supabase, API com JWT e dados em PostgreSQL. Seus lançamentos sincronizam entre dispositivos.',
    icon: 'shield',
  },
] as const;

export const STEPS = [
  {
    title: 'Abra sua conta',
    description:
      'Cadastre-se como dono ou motorista. O onboarding conduz empresa, primeiro veículo e primeiro motorista — em poucos minutos.',
  },
  {
    title: 'Registre cada viagem',
    description:
      'Informe rota, frete e responsáveis. Durante o trajeto, lance despesas com comprovante e adiantamentos quando houver.',
  },
  {
    title: 'Feche o acerto',
    description:
      'Finalize a viagem: o sistema calcula comissão e valor a pagar. Gere PDF, compartilhe com o motorista e marque como pago.',
  },
] as const;

/** Exemplos da seção #app — só explicação, sem dados. */
export const APP_EXAMPLES = [
  {
    tag: 'Dono da frota',
    title: 'Dashboard',
    icon: 'truck' as const,
    description:
      'Visão do mês com viagens, faturamento e indicadores — tudo num painel só, no desktop ou no celular.',
  },
  {
    tag: 'Fechamento',
    title: 'Acerto',
    icon: 'settlement' as const,
    description:
      'Ao finalizar a viagem, despesas, adiantamentos e comissão entram no cálculo — você vê quanto pagar ao motorista.',
  },
  {
    tag: 'Motorista',
    title: 'Mobile',
    icon: 'mobile' as const,
    description:
      'Viagens ativas, comissões e histórico na palma da mão. Instale na tela inicial e use como app na estrada.',
  },
] as const;

export const AUDIENCES = [
  {
    tag: 'Motorista',
    title: 'Na estrada, você precisa saber quanto sobrou — não só quanto faturou',
    items: [
      'Lance despesas com foto direto no celular',
      'Veja adiantamentos já descontados no acerto',
      'Consulte viagens ativas e histórico completo',
    ],
    accent: false,
  },
  {
    tag: 'Dono de frota',
    title: 'No escritório, você precisa fechar o mês sem surpresa na comissão',
    items: [
      'Dashboard com viagens e indicadores do período',
      'Relatórios por veículo, motorista e viagem',
      'Equipe e frota centralizadas num só sistema',
    ],
    accent: true,
  },
] as const;

export const SEGMENTS = [
  'Motoristas autônomos',
  'Donos de frota',
  'Transportadoras',
  'Agregados',
] as const;

export const PLANS = [
  {
    key: 'BASIC',
    name: 'Básico',
    description: 'Operações pequenas com limite enxuto.',
    priceBrl: 29.9,
    maxVehicles: 5,
    maxDrivers: 5,
    featured: false,
  },
  {
    key: 'PRO',
    name: 'Pro',
    description: 'Frotas em crescimento com mais capacidade.',
    priceBrl: 79.9,
    maxVehicles: 15,
    maxDrivers: 15,
    featured: true,
  },
  {
    key: 'PREMIUM',
    name: 'Premium',
    description: 'Limites amplos para operações maiores.',
    priceBrl: 199.9,
    maxVehicles: null,
    maxDrivers: null,
    featured: false,
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: 'Como funciona o teste grátis?',
    answer: `Após criar a conta, o onboarding guia o cadastro da empresa — nesse momento começam ${TRIAL_DAYS} dias de teste com até ${TRIAL_MAX_VEHICLES} veículos. Não pedimos cartão no cadastro; o checkout Stripe só entra quando você escolher um plano pago.`,
  },
  {
    question: 'Motorista e dono usam o mesmo app?',
    answer:
      'Sim. Cada perfil vê apenas o que importa: motoristas acessam suas viagens, despesas e acertos; donos gerenciam frota, equipe, relatórios e configurações.',
  },
  {
    question: 'Preciso instalar algo no computador?',
    answer:
      'Não. O Truck Finanças roda no navegador. No celular, você pode instalar como PWA (adicionar à tela inicial) para acesso rápido na estrada.',
  },
  {
    question: 'Meus dados ficam seguros?',
    answer:
      'Autenticação via Supabase, API protegida por JWT e dados em PostgreSQL na nuvem. Comprovantes ficam em storage com acesso controlado pelo servidor.',
  },
  {
    question: 'Posso cancelar a assinatura?',
    answer:
      'Sim. Pelo portal de cobrança Stripe você gerencia pagamento e cancelamento. O acesso permanece até o fim do período já pago.',
  },
  {
    question: 'Preciso de ajuda ou suporte?',
    answer: `Envie um e-mail para ${LEGAL_CONTACT_EMAIL}. Respondemos em dias úteis, das 9h às 18h (horário de Brasília).`,
  },
] as const;

export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatLimit(value: number | null): string {
  return value === null ? 'Ilimitado' : `Até ${value}`;
}
