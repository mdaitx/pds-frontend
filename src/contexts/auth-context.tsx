'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createClient } from '@/lib/supabase';
import { fetchMe, type AuthUser } from '@/lib';
import type { Session } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  appUser: AuthUser | null;
  loading: boolean;
  error: string | null;
  /** Erro de configuração (ex.: variáveis de ambiente faltando) */
  configError: string | null;
};

type AuthContextValue = AuthState & {
  signOut: () => Promise<void>;
  refreshAppUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Inicialização única: cliente Supabase e configError (evita setState síncrono em effect). */
function getInitialAuthState(): {
  supabase: SupabaseClient | null;
  configError: string | null;
  loading: boolean;
} {
  try {
    const client = createClient();
    return { supabase: client, configError: null, loading: true };
  } catch (e) {
    return {
      supabase: null,
      configError: e instanceof Error ? e.message : 'Configuração do Supabase ausente.',
      loading: false,
    };
  }
}

const initialAuthState = getInitialAuthState();

/**
 * Provedor de autenticação: mantém sessão Supabase e perfil do usuário no backend (appUser).
 *
 * Fluxo:
 * 1. Cria cliente Supabase (uma vez); se falhar, configError já vem no estado inicial.
 * 2. getSession() inicial + onAuthStateChange: atualiza session e chama fetchMe para appUser.
 * 3. refreshAppUser: re-busca /auth/me (útil após register-profile).
 *
 * Use useAuth() dentro de árvore que esteja dentro de <AuthProvider>.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(initialAuthState.loading);
  const [error, setError] = useState<string | null>(null);
  const [configError] = useState<string | null>(initialAuthState.configError);
  const [supabase] = useState<SupabaseClient | null>(initialAuthState.supabase);

  const refreshAppUser = useCallback(async (accessToken?: string) => {
    const token = accessToken ?? session?.access_token ?? null;
    if (!token) {
      setAppUser(null);
      return;
    }
    try {
      const me = await fetchMe(token);
      setAppUser(me);
      setError(null);
    } catch (e) {
      setAppUser(null);
      setError(e instanceof Error ? e.message : 'Erro ao carregar perfil');
    }
  }, [session?.access_token]);

  // Quando temos cliente: busca sessão inicial e inscreve em mudanças de auth
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.access_token) {
        refreshAppUser(s.access_token);
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s ?? null);
      if (s?.access_token) {
        await refreshAppUser(s.access_token);
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, refreshAppUser]);

  const signOut = useCallback(async () => {
    setError(null);
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setAppUser(null);
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      appUser,
      loading,
      error,
      configError,
      signOut,
      refreshAppUser: () => refreshAppUser(session?.access_token),
    }),
    [session, appUser, loading, error, configError, signOut, refreshAppUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para acessar sessão, appUser, loading, error e signOut/refreshAppUser. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
