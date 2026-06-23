import "server-only";
import { createClient } from "@supabase/supabase-js";
// NOTA: client sem generic <Database> por ora (tipos reais via `npm run db:types`).

/**
 * Client ADMIN do Supabase — usa a SERVICE ROLE KEY e **ignora a RLS**.
 *
 * Uso exclusivo no servidor e em fluxos confiáveis (ex.: webhook de pagamento,
 * tarefas agendadas). NUNCA expor a service role key ao navegador.
 */
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
