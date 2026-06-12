import type { OnboardingStatus } from '@/services/api';

export const ONBOARDING_PREFETCH_STORAGE_KEY = 'onboarding-status-prefetch-v1';
export const ONBOARDING_PREFETCH_TTL_MS = 30_000;

export function readPrefetchedOnboardingStatus(): OnboardingStatus | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(ONBOARDING_PREFETCH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { status?: OnboardingStatus; ts?: number };
    const status = parsed.status;
    const ts = parsed.ts;
    if (!status || typeof ts !== 'number') return null;
    if (Date.now() - ts > ONBOARDING_PREFETCH_TTL_MS) return null;
    return status;
  } catch {
    return null;
  }
}

export function writePrefetchedOnboardingStatus(status: OnboardingStatus): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(
    ONBOARDING_PREFETCH_STORAGE_KEY,
    JSON.stringify({ status, ts: Date.now() }),
  );
}
