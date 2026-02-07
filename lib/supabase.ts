import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/** Cliente Supabase para o browser. Use apenas em client components. */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error(
      'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local do pds-frontend (veja .env.example).'
    );
  }
  return createSupabaseClient(url, key);
}
