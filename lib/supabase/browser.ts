"use client";

import { createBrowserClient } from "@supabase/ssr";
// NOTA: client sem generic <Database> por ora (tipos reais via `npm run db:types`).

/**
 * Client do Supabase para uso no navegador (Client Components).
 * Usa a chave ANÔNIMA e fica sujeito à RLS.
 */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
