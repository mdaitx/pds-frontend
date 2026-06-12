export type MarketingScreenshotVariant = 'hero' | 'desktop' | 'mobile';

export type MarketingScreenshotSpec = {
  file: string;
  fallbackFile?: string;
  alt: string;
  width: number;
  height: number;
  variant: MarketingScreenshotVariant;
  caption?: string;
};

export const HERO_SCREENSHOT: MarketingScreenshotSpec = {
  file: 'dashboard-hero.png',
  fallbackFile: 'dashboard-desktop.png',
  alt: 'Painel do Truck Finanças com indicadores de viagens, faturamento e lucro',
  width: 720,
  height: 520,
  variant: 'hero',
};

export const SHOWCASE_SCREENSHOTS: MarketingScreenshotSpec[] = [
  {
    file: 'dashboard-desktop.png',
    alt: 'Painel do dono de frota com faturamento, despesas e gráficos',
    width: 1280,
    height: 800,
    variant: 'desktop',
    caption: 'Dashboard — visão financeira do mês',
  },
  {
    file: 'acerto-desktop.png',
    alt: 'Tela de acerto com despesas, comissão e valor a pagar ao motorista',
    width: 1280,
    height: 900,
    variant: 'desktop',
    caption: 'Acerto — transparência no fechamento da viagem',
  },
  {
    file: 'dashboard-mobile.png',
    alt: 'Versão mobile do painel para uso na estrada',
    width: 390,
    height: 844,
    variant: 'mobile',
    caption: 'PWA no celular — mesma conta, mesma operação',
  },
];

export function marketingScreenshotSrc(theme: 'light' | 'dark', file: string): string {
  return `/marketing/${theme}/${file}`;
}
