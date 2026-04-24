import Image from 'next/image';
import { cn } from '@/lib/cn';

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ size = 40, className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/brand-logo-rounded.png"
      alt="Truck Finanças"
      width={size}
      height={size}
      priority={priority}
      className={cn('rounded-2xl object-contain', className)}
    />
  );
}
