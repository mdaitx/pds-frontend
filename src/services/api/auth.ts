/**
 * Autenticação e perfil — chamadas ao backend PDS (NestJS).
 */

import { apiFetch, ApiError, getAccessToken } from '@/lib/api-client';
import { postMultipartJson } from './multipart';

export type AuthUser = {
  id: string;
  email: string;
  role: 'OWNER' | 'DRIVER' | 'ADMIN';
  supabaseUserId: string;
  companyId?: string | null;
  photoUrl?: string | null;
  displayName?: string | null;
};

/**
 * GET /auth/me — perfil atual (cria linha em `usuarios` no primeiro acesso).
 * Deduplica pedidos com o mesmo access_token para evitar vários 401 no DevTools
 * quando `getSession` e `onAuthStateChange` disparam quase ao mesmo tempo.
 */
let fetchMeInflightToken: string | null = null;
let fetchMeInflight: Promise<AuthUser> | null = null;

export async function fetchMe(token?: string | null): Promise<AuthUser> {
  const t =
    token !== undefined && token !== null ? token : await getAccessToken();
  if (typeof t !== 'string' || t.trim() === '') {
    throw new ApiError('Token não informado', 401);
  }

  if (fetchMeInflightToken === t && fetchMeInflight) {
    return fetchMeInflight;
  }

  fetchMeInflightToken = t;
  fetchMeInflight = apiFetch<AuthUser>('/auth/me', { method: 'GET', token: t }).finally(() => {
    if (fetchMeInflightToken === t) {
      fetchMeInflightToken = null;
      fetchMeInflight = null;
    }
  });

  return fetchMeInflight;
}

/** POST /auth/register-profile — define role após primeiro login */
export async function registerProfile(
  role: AuthUser['role'],
  token?: string | null
): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/register-profile', {
    method: 'POST',
    body: JSON.stringify({ role }),
    token,
  });
}

/** POST /auth/recover-password — envia e-mail de recuperação (não precisa de token) */
export async function recoverPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/recover-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    token: null,
  });
}

/** PATCH /auth/me — atualiza perfil (ex.: remover foto com `{ photoUrl: null }`). */
export async function patchAuthProfile(payload: { photoUrl?: string | null }): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** POST /auth/upload-photo — envia imagem e atualiza `photoUrl` no servidor. */
export async function uploadAuthProfilePhoto(file: File): Promise<AuthUser> {
  return postMultipartJson<AuthUser>('/auth/upload-photo', file);
}
