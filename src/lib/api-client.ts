/**
 * Cliente HTTP base para o backend PDS (NestJS).
 *
 * - Envia o access_token do Supabase no header Authorization quando disponível.
 * - Usa credentials: 'include' para cookies, se no futuro houver sessão por cookie.
 * - Centraliza a URL da API (NEXT_PUBLIC_API_URL) e o tratamento de erros.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const json = JSON.parse(body);
      message = json.message ?? json.error ?? body;
    } catch {
      // use body as message
    }
    throw new Error(message || `Erro ${res.status}`);
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as Promise<T>;
}

export { API_URL };
