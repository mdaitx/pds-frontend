'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ActivityHintContextValue = {
  /** Contador para badge no menu “Viagens” (novas ações: viagem criada / finalizada). */
  tripsActivityCount: number;
  bumpTripsActivity: () => void;
  clearTripsActivity: () => void;
};

const ActivityHintContext = createContext<ActivityHintContextValue | null>(null);

export function ActivityHintProvider({ children }: { children: ReactNode }) {
  const [tripsActivityCount, setTripsActivityCount] = useState(0);

  const bumpTripsActivity = useCallback(() => {
    setTripsActivityCount((n) => n + 1);
  }, []);

  const clearTripsActivity = useCallback(() => {
    setTripsActivityCount(0);
  }, []);

  const value = useMemo(
    () => ({ tripsActivityCount, bumpTripsActivity, clearTripsActivity }),
    [tripsActivityCount, bumpTripsActivity, clearTripsActivity],
  );

  return (
    <ActivityHintContext.Provider value={value}>{children}</ActivityHintContext.Provider>
  );
}

export function useActivityHint(): ActivityHintContextValue {
  const ctx = useContext(ActivityHintContext);
  if (!ctx) {
    throw new Error('useActivityHint deve ser usado dentro de ActivityHintProvider');
  }
  return ctx;
}
