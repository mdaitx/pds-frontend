import { API_URL, getAccessToken, rethrowIfDisconnected } from '@/lib/api-client';

/** POST multipart (uma única parte `file`) e parse JSON da resposta. */
export async function postMultipartJson<T>(
  path: string,
  file: File,
  fieldName = 'file'
): Promise<T> {
  const token = await getAccessToken();
  const form = new FormData();
  form.append(fieldName, file);
  const headers: HeadersInit = {};
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      body: form,
      credentials: 'include',
      headers,
    });
  } catch (err) {
    rethrowIfDisconnected(err);
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.message ?? j.error ?? text;
    } catch {
      /* ignore */
    }
    throw new Error(msg || `Erro ${res.status}`);
  }
  return res.json() as Promise<T>;
}
