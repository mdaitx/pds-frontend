import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase para **client components** via `@supabase/ssr` (`createBrowserClient`).
 * Persiste a sessão em **cookies** (compatível com `middleware.ts` e refresh no edge).
 *
 * Evita múltiplas instâncias no browser (o pacote também deduplica internamente).
 * Nunca use a `service_role` key no frontend.
 */
let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error(
      'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local do pds-frontend (veja .env.example).'
    );
  }
  _client = createBrowserClient(url, key) as unknown as SupabaseClient;
  return _client;
}
