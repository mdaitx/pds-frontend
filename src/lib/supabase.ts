import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cria o cliente Supabase para uso no browser (client components).
 *
 * Use apenas em código que roda no cliente (ex: 'use client', useEffect, event handlers).
 * As chaves NEXT_PUBLIC_* são públicas por design; o Supabase usa RLS (Row Level Security)
 * e políticas no projeto para proteger os dados. Nunca coloque aqui a service_role key.
 */
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
