import { apiFetch } from '@/lib/api-client';

export type SubscriptionStatusValue =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED';

export type SubscriptionPlanKey = 'BASIC' | 'PRO' | 'PREMIUM';

export type SubscriptionPlan = {
  key: SubscriptionPlanKey;
  name: string;
  description: string;
  priceBrl: number;
  maxVehicles: number | null;
  maxDrivers: number | null;
  checkoutReady: boolean;
  isCurrent: boolean;
};

export type SubscriptionStatusResponse = {
  status: SubscriptionStatusValue;
  currentPlanKey: SubscriptionPlanKey;
  plans: SubscriptionPlan[];
  limits: {
    maxVehicles: number | null;
    maxDrivers: number | null;
  };
  isOperational: boolean;
  vehicleCount: number;
  driverCount: number;
  maxVehiclesTrial: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeConfigured: boolean;
  checkoutAvailable: boolean;
  message: string | null;
};

/** GET /subscription/status */
export async function getSubscriptionStatus(accessToken?: string): Promise<SubscriptionStatusResponse> {
  return apiFetch<SubscriptionStatusResponse>('/subscription/status', {
    method: 'GET',
    ...(accessToken !== undefined ? { token: accessToken } : {}),
  });
}

export type SubscriptionCheckoutResponse = { url: string | null };

/** POST /subscription/checkout */
export async function postSubscriptionCheckout(payload: {
  planKey: SubscriptionPlanKey;
  successPath?: string;
  cancelPath?: string;
}): Promise<SubscriptionCheckoutResponse> {
  return apiFetch<SubscriptionCheckoutResponse>('/subscription/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** POST /subscription/portal */
export async function postSubscriptionPortal(payload: { returnPath?: string }): Promise<{
  url: string | null;
}> {
  return apiFetch('/subscription/portal', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
