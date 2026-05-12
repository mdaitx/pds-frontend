import { describe, expect, it, vi, afterEach } from 'vitest';
import { defaultMonthlyReportRange, reportsTripsQueryKey } from './reports';

describe('reportsTripsQueryKey', () => {
  it('produz queryKey estável para React Query', () => {
    expect(reportsTripsQueryKey('2026-05-01', '2026-05-31')).toEqual([
      'reports-trips',
      '2026-05-01',
      '2026-05-31',
    ]);
  });
});

describe('defaultMonthlyReportRange', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('usa primeiro e último dia do mês civil corrente', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-11T12:00:00Z'));

    const { fromYmd, toYmd } = defaultMonthlyReportRange();
    expect(fromYmd).toBe('2026-05-01');
    expect(toYmd).toBe('2026-05-31');
  });

  it('fevereiro em ano bissexto termina em 29', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-15T12:00:00Z'));

    const { fromYmd, toYmd } = defaultMonthlyReportRange();
    expect(fromYmd).toBe('2024-02-01');
    expect(toYmd).toBe('2024-02-29');
  });
});
