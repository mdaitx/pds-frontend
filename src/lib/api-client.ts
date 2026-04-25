/**
 * Cliente HTTP base para o backend PDS (NestJS).
 *
 * - Envia o access_token do Supabase no header Authorization quando disponível.
 * - Usa credentials: 'include' para cookies, se no futuro houver sessão por cookie.
 * - Centraliza a URL da API (NEXT_PUBLIC_API_URL) e o tratamento de erros.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:4000';

/** Erro HTTP da API com status (útil para tratar 401 e renovar sessão). */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/** Quando o navegador não consegue completar o fetch (API parada, rede, etc.). */
export const API_UNAVAILABLE_MESSAGE =
  'Servidor da API não está acessível (porta 4000). Em desenvolvimento: use `npm run dev` na raiz do projeto (sobe backend + frontend) ou `npm run dev` em pds-frontend. Não use só `npm run dev:next` sem o backend.';

/** Converte falhas de rede do fetch em ApiError 503 com mensagem orientativa. */
export function rethrowIfDisconnected(error: unknown): never {
  const msg = error instanceof Error ? error.message : String(error);
  const disconnected =
    error instanceof TypeError ||
    /Failed to fetch|NetworkError|ECONNREFUSED|fetch failed|Load failed|network error/i.test(msg);
  if (disconnected) {
    throw new ApiError(API_UNAVAILABLE_MESSAGE, 503);
  }
  throw error instanceof Error ? error : new Error(String(error));
}

/** Obtém o token da sessão Supabase no cliente; retorna null no SSR ou se não logado. */
export async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const supabase = (await import('./supabase')).createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Faz requisição à API com Content-Type JSON e Bearer token quando disponível.
 * Em caso de res não ok, tenta extrair message do JSON de erro e lança Error.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token: tokenOverride, ...init } = options;
  const token = tokenOverride !== undefined ? tokenOverride : await getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...init.headers,
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    rethrowIfDisconnected(err);
  }

  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const json = JSON.parse(body);
      const msg = json.message ?? json.error ?? body;
      message = Array.isArray(msg) ? msg.join('. ') : msg;
    } catch {
      // use body as message
    }
    throw new ApiError(message || `Erro ${res.status}`, res.status);
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as Promise<T>;
}

export { API_URL };
