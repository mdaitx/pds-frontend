'use client';

import { Truck, type LucideProps } from 'lucide-react';
import type { VehicleType } from '@/lib';

/**
 * Semi-reboque (carreta): vista lateral — traseira à esquerda (3 rodas juntas), frente à direita (patim).
 * Mesmo traço Lucide que `Truck`: stroke 2, rodas cy 18 / r 2.
 */
export function SemiTrailerIcon({ className, size = 24, ...props }: LucideProps) {
  const s = size ?? 24;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      <path d="M3 8h15v7H3z" />
      <path d="M2 16h20" />
      <path d="M18 16v4" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="7.5" cy="18" r="2" />
      <circle cx="10" cy="18" r="2" />
    </svg>
  );
}

type Props = LucideProps & {
  vehicleType?: VehicleType | null;
};

export function VehicleTruckOrTrailerIcon({ vehicleType, ...props }: Props) {
  if (vehicleType === 'SEMI_REBOQUE') {
    return <SemiTrailerIcon {...props} />;
  }
  return <Truck {...props} />;
}
