'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createClient } from '@/lib/supabase';
import { ApiError, fetchMe, type AuthUser } from '@/lib';
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
  /** Sessão Supabase ativa */
  isAuthenticated: boolean;
  /** Perfil `/auth/me` carregado */
  hasAppUser: boolean;
  /** `true` quando não há erro de config e a carga inicial (sessão + perfil) terminou */
  isReady: boolean;
  /** Verifica se o papel atual está entre os permitidos */
  hasRole: (...roles: AuthUser['role'][]) => boolean;
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
  /** Evita `setLoading(false)` de uma sincronização antiga após `getSession` + `onAuthStateChange` */
  const syncGenerationRef = useRef(0);
  /** Uma tentativa de refresh após 401 por usuário logado — evita loop 401→refresh→TOKEN_REFRESHED→401→… e 429 no Supabase */
  const refresh401ConsumedRef = useRef(false);
  const lastAuthUserIdRef = useRef<string | null>(null);
  /** Deduplica `refreshAppUser` com o mesmo token (Strict Mode / eventos repetidos) */
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const refreshInFlightTokenRef = useRef<string | null>(null);

  /** Remove sessão Supabase local inválida (evita /auth/me em loop com 401 no painel de rede). */
  const clearStaleAuthSession = useCallback(async () => {
    setAppUser(null);
    refresh401ConsumedRef.current = false;
    lastAuthUserIdRef.current = null;
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
  }, [supabase]);

  const refreshAppUser = useCallback(async (accessToken?: string) => {
    const token = accessToken ?? session?.access_token ?? null;
    if (!token) {
      setAppUser(null);
      return;
    }

    if (refreshInFlightTokenRef.current === token && refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const fail = (e: unknown) => {
      setAppUser(null);
      setError(e instanceof Error ? e.message : 'Erro ao carregar perfil');
    };

    const run = (async () => {
      try {
        const me = await fetchMe(token);
        setAppUser(me);
        setError(null);
      } catch (e) {
        const unauthorized = e instanceof ApiError && e.status === 401;
        if (!unauthorized || !supabase) {
          fail(e);
          return;
        }
        if (refresh401ConsumedRef.current) {
          await clearStaleAuthSession();
          setError(
            'Sessão inválida ou backend com outro projeto Supabase. Faça login novamente.'
          );
          return;
        }
        refresh401ConsumedRef.current = true;
        const { data, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr || !data.session?.access_token) {
          const msg =
            refreshErr?.message?.includes('429') || (refreshErr as { status?: number })?.status === 429
              ? 'Limite de renovação de sessão atingido. Aguarde um minuto e recarregue a página.'
              : refreshErr?.message ?? 'Falha ao renovar sessão';
          await clearStaleAuthSession();
          fail(new Error(msg));
          return;
        }
        setSession(data.session);
        try {
          const me = await fetchMe(data.session.access_token);
          setAppUser(me);
          setError(null);
        } catch (e2) {
          if (e2 instanceof ApiError && e2.status === 401) {
            await clearStaleAuthSession();
          }
          fail(e2);
        }
      }
    })();

    refreshInFlightTokenRef.current = token;
    refreshInFlightRef.current = run;
    void run.finally(() => {
      if (refreshInFlightRef.current === run) {
        refreshInFlightRef.current = null;
        refreshInFlightTokenRef.current = null;
      }
    });

    return run;
  }, [session?.access_token, supabase, clearStaleAuthSession]);

  // Sessão inicial + mudanças: aguarda `fetchMe` quando há token para o guard de rotas usar `appUser` confiável
  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    async function syncFromSession(s: Session | null) {
      const uid = s?.user?.id ?? null;
      if (uid !== lastAuthUserIdRef.current) {
        refresh401ConsumedRef.current = false;
        lastAuthUserIdRef.current = uid;
      }

      const gen = ++syncGenerationRef.current;
      setSession(s);
      if (s?.access_token) {
        await refreshAppUser(s.access_token);
      } else {
        setAppUser(null);
      }
      if (!cancelled && syncGenerationRef.current === gen) {
        setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return;
      void syncFromSession(s);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (cancelled) return;
      void syncFromSession(s ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
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
      isAuthenticated: Boolean(session),
      hasAppUser: Boolean(appUser),
      isReady: !loading && !configError,
      hasRole: (...roles: AuthUser['role'][]) =>
        appUser ? roles.includes(appUser.role) : false,
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
