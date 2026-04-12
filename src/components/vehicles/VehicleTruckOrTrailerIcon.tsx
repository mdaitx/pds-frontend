'use client';

import { Truck, type LucideProps } from 'lucide-react';
import type { VehicleType } from '@/lib';

/** Semi-reboque (carreta), estilo Lucide (24×24, stroke 2). */
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
      <path d="M2 11h11v6H2z" />
      <circle cx="6.5" cy="20" r="2" />
      <circle cx="12.5" cy="20" r="2" />
      <path d="M13 11V7h5l3 3v4h-8" />
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
