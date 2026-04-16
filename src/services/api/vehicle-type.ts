/** Tipo de veículo (Prisma / API). */
export type VehicleType = 'CAMINHAO' | 'CAVALO_MECANICO' | 'SEMI_REBOQUE';

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  CAMINHAO: 'Caminhão',
  CAVALO_MECANICO: 'Cavalo mecânico',
  SEMI_REBOQUE: 'Semi-reboque',
};
