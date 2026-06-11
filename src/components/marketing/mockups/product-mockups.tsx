import { MarketingMockupShell } from '@/components/marketing/mockups/marketing-mockup-shell';
import {
  MockupAppShell,
  MockupMetricsRow,
  MockupTripsTable,
  MockupWelcomeBanner,
} from '@/components/marketing/mockups/mockup-primitives';

function DashboardMockupContent() {
  return (
    <>
      <MockupWelcomeBanner />
      <MockupMetricsRow />
      <MockupTripsTable />
    </>
  );
}

function MockupPanel({
  ariaLabel,
  caption,
  variant,
  float,
  interactive,
  className,
  children,
}: {
  ariaLabel: string;
  caption?: string;
  variant: 'hero' | 'panel' | 'phone';
  float?: boolean;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <MarketingMockupShell
      ariaLabel={ariaLabel}
      caption={caption}
      variant={variant}
      float={float}
      interactive={interactive}
      className={className}
    >
      <MockupAppShell>{children}</MockupAppShell>
    </MarketingMockupShell>
  );
}

export function HeroDashboardMockup() {
  return (
    <MockupPanel
      ariaLabel="Painel do Truck Finanças com banner, métricas e viagens recentes"
      variant="hero"
      float
      interactive
    >
      <DashboardMockupContent />
    </MockupPanel>
  );
}
