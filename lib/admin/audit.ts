import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

/** Registra uma ação administrativa no audit_log (via função SECURITY DEFINER). */
export async function audit(acao: string, alvo: string, meta: Record<string, unknown> = {}) {
  const supabase = await createServerSupabase();
  await supabase.rpc("registrar_admin_audit", { p_acao: acao, p_alvo: alvo, p_meta: meta });
}
