'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useIsDarkTheme } from '@/hooks/use-document-theme';
import {
  marketingScreenshotSrc,
  type MarketingScreenshotSpec,
  type MarketingScreenshotVariant,
} from '@/lib/marketing/screenshots';
import { cn } from '@/lib/cn';

type MarketingScreenshotProps = {
  spec: MarketingScreenshotSpec;
  priority?: boolean;
  className?: string;
  showCaption?: boolean;
};

const variantClass: Record<MarketingScreenshotVariant, string> = {
  hero: 'marketing-screenshot--hero',
  desktop: 'marketing-screenshot--desktop',
  mobile: 'marketing-screenshot--mobile',
};

function resolveSrc(isDark: boolean, file: string): string {
  return marketingScreenshotSrc(isDark ? 'dark' : 'light', file);
}

export function MarketingScreenshot({
  spec,
  priority = false,
  className,
  showCaption = false,
}: MarketingScreenshotProps) {
  const isDark = useIsDarkTheme();
  const primaryFile = spec.file;
  const fallbackFile = spec.fallbackFile;

  const themedSrc = useMemo(
    () => resolveSrc(isDark, primaryFile),
    [isDark, primaryFile],
  );
  const lightPrimarySrc = useMemo(
    () => resolveSrc(false, primaryFile),
    [primaryFile],
  );
  const lightFallbackSrc = useMemo(
    () => (fallbackFile ? resolveSrc(false, fallbackFile) : null),
    [fallbackFile],
  );

  const [src, setSrc] = useState(themedSrc);

  useEffect(() => {
    setSrc(themedSrc);
  }, [themedSrc]);

  const handleError = () => {
    if (src === themedSrc && isDark) {
      setSrc(lightPrimarySrc);
      return;
    }
    if (fallbackFile && src !== lightFallbackSrc && lightFallbackSrc) {
      setSrc(lightFallbackSrc);
    }
  };

  return (
    <figure
      className={cn(
        'marketing-screenshot',
        variantClass[spec.variant],
        className,
      )}
      style={{ aspectRatio: `${spec.width} / ${spec.height}` }}
    >
      <div className="marketing-screenshot__frame">
        <Image
          src={src}
          alt={spec.alt}
          fill
          priority={priority}
          sizes={
            spec.variant === 'mobile'
              ? '(max-width: 768px) 80vw, 280px'
              : spec.variant === 'hero'
                ? '(max-width: 1024px) 92vw, 520px'
                : '(max-width: 1024px) 100vw, 720px'
          }
          className="marketing-screenshot__image transition-opacity duration-300 ease-out"
          onError={handleError}
          key={src}
        />
      </div>
      {showCaption && spec.caption ? (
        <figcaption className="marketing-screenshot__caption">{spec.caption}</figcaption>
      ) : null}
      {!showCaption ? (
        <figcaption className="sr-only">{spec.alt}</figcaption>
      ) : null}
    </figure>
  );
}
