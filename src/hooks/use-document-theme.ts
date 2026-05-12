'use client';

import { useSyncExternalStore } from 'react';

/** Junto com `<html data-theme="dark">`: alterna tema em qualquer cliente. */
export function subscribeToDocumentTheme(callback: () => void): () => void {
  const wrapped = (): void => callback();
  window.addEventListener('pds-theme-change', wrapped);
  window.addEventListener('storage', wrapped);
  return () => {
    window.removeEventListener('pds-theme-change', wrapped);
    window.removeEventListener('storage', wrapped);
  };
}

export function getIsDarkFromDocument(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

/** `true` no cliente quando o tema persistido/manual é escuro (SSR/HMR inicial: `false`). */
export function useIsDarkTheme(): boolean {
  return useSyncExternalStore(subscribeToDocumentTheme, getIsDarkFromDocument, () => false);
}
