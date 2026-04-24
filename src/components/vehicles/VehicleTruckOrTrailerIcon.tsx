'use client';

import { Truck, type LucideProps } from 'lucide-react';
import type { VehicleType } from '@/lib';

/**
 * Semi-reboque (carreta): vista lateral, seguindo o pictograma enviado como referencia.
 * Mantem `currentColor` para herdar exatamente a mesma cor usada no fallback do caminhao.
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
      <path d="M3 7h15v8H3z" />
      <path d="M18 11h3v4h-3" />
      <path d="M2 15h20" />
      <path d="M18 15v4" />
      <path d="M19.5 19h2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="9" cy="18" r="2" />
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
