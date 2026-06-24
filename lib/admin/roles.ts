"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { audit } from "@/lib/admin/audit";

// ---------------------------------------------------------------------------
// Perfil de acesso (admin). Reaproveita o RBAC homologado do sistema:
//  - "Guerreiro"            = qualquer usuário autenticado (sem role admin);
//  - "Guerreiro + Admin"    = role global `admin` em user_roles (is_admin()).
// Não cria sistema paralelo: apenas concede/revoga a role global `admin`, lida
// pela RPC is_admin() usada em todo o app (menus, layouts, gates, RLS).
// A RLS `user_roles_admin (ALL, is_admin())` autoriza a escrita pelo admin
// logado via client autenticado — sem service role e sem migration.
// ---------------------------------------------------------------------------

const PERFIS = ["guerreiro", "administrador"] as const;
type Perfil = (typeof PERFIS)[number];

async function gateAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (!ehAdmin) redirect("/perfil");
  return { supabase, authUserId: user.id };
}

/**
 * Define o perfil de acesso de um usuário de domínio (public.users.id).
 * - "administrador": concede a role global `admin` (idempotente).
 * - "guerreiro":     revoga a role global `admin`.
 * Atualiza menus/rotas imediatamente (revalidate do layout).
 */
export async function definirPerfilAcesso(formData: FormData) {
  const { supabase, authUserId } = await gateAdmin();
  const userId = String(formData.get("user_id") ?? ""); // = public.users.id
  const perfilRaw = String(formData.get("perfil") ?? "");
  const back = `/admin/guerreiros/${userId}`;
  const erroRedir = (msg: string): never => redirect(`${back}?erro=${encodeURIComponent(msg)}`);

  if (!userId) erroRedir("Usuário inválido.");
  if (!PERFIS.includes(perfilRaw as Perfil)) erroRedir("Perfil inválido.");
  const perfil = perfilRaw as Perfil;

  // id de domínio do admin logado — impede auto-rebaixamento (evita lockout).
  const { data: meRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  const meuId = (meRow as { id: string } | null)?.id ?? null;

  if (perfil === "guerreiro") {
    if (meuId && meuId === userId)
      erroRedir("Você não pode remover o seu próprio acesso de administrador.");
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin")
      .eq("scope_type", "global");
    if (error) erroRedir(error.message);
    await audit("perfil_acesso_alterado", `user:${userId}`, { perfil: "guerreiro" });
  } else {
    // administrador: concede a role global `admin` se ainda não existir.
    // (unique trata NULL como distinto; checamos antes para não duplicar.)
    const { data: existeRow } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .eq("scope_type", "global")
      .is("scope_id", null)
      .maybeSingle();
    if (!existeRow) {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin", scope_type: "global", scope_id: null });
      if (error) erroRedir(error.message);
    }
    await audit("perfil_acesso_alterado", `user:${userId}`, { perfil: "administrador" });
  }

  revalidatePath(back);
  revalidatePath("/", "layout"); // menus/header refletem o novo perfil de imediato
  redirect(`${back}?ok=${encodeURIComponent("Perfil de acesso atualizado.")}`);
}
