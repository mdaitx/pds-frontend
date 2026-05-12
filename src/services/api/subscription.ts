import { apiFetch } from '@/lib/api-client';

export type SubscriptionStatusValue =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED';

export type SubscriptionStatusResponse = {
  status: SubscriptionStatusValue;
  isOperational: boolean;
  vehicleCount: number;
  maxVehiclesTrial: number;
  pricePerVehicleBrl: number;
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
