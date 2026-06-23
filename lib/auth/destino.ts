import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Destino pós-login conforme papel/matrícula (sem mexer em RLS/regras):
 * - admin           → /admin
 * - matrícula ativa → /dashboard
 * - caso contrário  → /perfil
 */
export async function destinoPosLogin(): Promise<string> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login";

  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (ehAdmin) return "/admin";

  const { data: duRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const domainId = (duRow as { id: string } | null)?.id;
  if (domainId) {
    const { data: mRow } = await supabase
      .from("matriculas")
      .select("id")
      .eq("user_id", domainId)
      .eq("status", "ativa")
      .limit(1)
      .maybeSingle();
    if (mRow) return "/dashboard";
  }
  return "/perfil";
}
