/** Chave persistida ao alternar tema (login e demais telas eventualmente). */
export const THEME_STORAGE_KEY = 'pds-theme';

export type ThemePreference = 'light' | 'dark';

export function readStoredTheme(): ThemePreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw === 'dark' || raw === 'light' ? raw : null;
  } catch {
    return null;
  }
}

export function persistTheme(theme: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode etc. */
  }
}

/** Aplica no `<html>`: escuro usa `data-theme="dark"`; claro remove o atributo (tokens padrão :root). */
export function applyThemeToDocument(theme: ThemePreference): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}
