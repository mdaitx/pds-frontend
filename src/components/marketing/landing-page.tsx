import { MarketingHeader } from '@/components/marketing/header';
import { MarketingHero } from '@/components/marketing/hero';
import { MarketingSegmentsBand } from '@/components/marketing/segments-band';
import { MarketingFeatures } from '@/components/marketing/features';
import { MarketingHowItWorks } from '@/components/marketing/how-it-works';
import { MarketingAudience } from '@/components/marketing/audience';
import { MarketingShowcase } from '@/components/marketing/showcase';
import { MarketingPricing } from '@/components/marketing/pricing';
import { MarketingFaq } from '@/components/marketing/faq';
import { MarketingCtaSection } from '@/components/marketing/cta-section';
import { MarketingFooter } from '@/components/marketing/footer';

export function LandingPage() {
  return (
    <div className="marketing-page min-h-dvh bg-background text-foreground">
      <MarketingHeader />
      <main>
        <MarketingHero />
        <MarketingSegmentsBand />
        <MarketingFeatures />
        <MarketingShowcase />
        <MarketingHowItWorks />
        <MarketingAudience />
        <MarketingPricing />
        <MarketingFaq />
        <MarketingCtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
