import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
// NOTA: client sem generic <Database> por ora (tipos reais via `npm run db:types`).

/**
 * Client do Supabase para uso no servidor (Server Components, Server Actions,
 * Route Handlers). Usa a chave ANÔNIMA e respeita a sessão do usuário via
 * cookies — portanto fica sujeito à RLS.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component (cookies somente leitura).
            // A renovação de sessão é feita no middleware/Route Handler.
          }
        },
      },
    },
  );
}
