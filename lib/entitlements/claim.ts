import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Reivindica os entitlements pendentes do usuário autenticado (por e-mail).
 * Chama a função SQL `reivindicar_meus_entitlements` (SECURITY DEFINER) que usa
 * exclusivamente a sessão (current_user_id + e-mail próprio) — idempotente.
 * Chamado no login e na confirmação de e-mail.
 */
export async function reivindicarEntitlements() {
  const supabase = await createServerSupabase();
  await supabase.rpc("reivindicar_meus_entitlements");
}
