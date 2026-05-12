'use client';

import { Toaster } from 'sonner';
import { useIsDarkTheme } from '@/hooks';

export function AppToaster() {
  const theme = useIsDarkTheme() ? 'dark' : 'light';
  return <Toaster position="top-right" richColors theme={theme} closeButton duration={4000} />;
}
