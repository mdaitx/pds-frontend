/**
 * Cliente HTTP para o backend PDS.
 * Envia o access_token do Supabase no header Authorization quando disponível.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type AuthUser = {
  id: string;
  email: string;
  role: 'OWNER' | 'DRIVER' | 'ADMIN';
  supabaseUserId: string;
};

async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const supabase = (await import('./supabase')).createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

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

/** GET /auth/me - usuário atual (cria perfil no backend no primeiro acesso) */
export async function fetchMe(token?: string | null): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me', { method: 'GET', token });
}

/** POST /auth/register-profile - define role após primeiro login */
export async function registerProfile(role: AuthUser['role'], token?: string | null): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/register-profile', {
    method: 'POST',
    body: JSON.stringify({ role }),
    token,
  });
}

/** POST /auth/recover-password - envia e-mail de recuperação (não precisa de token) */
export async function recoverPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/recover-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    token: null,
  });
}
