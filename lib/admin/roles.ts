"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { audit } from "@/lib/admin/audit";

// ---------------------------------------------------------------------------
// Acesso ao Sistema (admin). Reaproveita o RBAC homologado — NÃO cria sistema
// paralelo, tabela ou migration:
//  - "Área do Guerreiro"  = todo usuário autenticado (sempre habilitada).
//  - "Área Administrativa" = role global `admin` em user_roles, lida pela RPC
//    is_admin() usada em todo o app (menus, layouts, gates, RLS).
//
// Perfil administrativo e escopo já têm estrutura no schema (app_role +
// scope_type/scope_id em user_roles). No MVP apenas o perfil "Administrador
// Global" (role=admin, scope_type=global) é persistido; Staff/Suporte e os
// escopos não-globais ficam PREPARADOS (UI desabilitada + recusa defensiva
// aqui) para serem ligados depois sem regra nova.
//
// A RLS `user_roles_admin (ALL, is_admin())` autoriza a escrita pelo admin
// logado via client autenticado — sem service role e sem migration.
// ---------------------------------------------------------------------------

const PERFIS_ADMIN = ["administrador_global", "staff", "suporte"] as const;
type PerfilAdmin = (typeof PERFIS_ADMIN)[number];

const ESCOPOS = ["global", "programa", "turma"] as const;
type Escopo = (typeof ESCOPOS)[number];

// Perfis efetivamente ligados no MVP. Mantém Staff/Suporte preparados sem
// persistir papéis que ainda não têm fluxo/telas próprias.
const PERFIS_ATIVOS_MVP: PerfilAdmin[] = ["administrador_global"];

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
 * Define o acesso ao sistema de um usuário de domínio (public.users.id) a
 * partir da seção "Acesso ao Sistema" do cadastro do Guerreiro.
 *
 * Campos do formulário:
 *  - user_id      (public.users.id)
 *  - area_admin   ("1" quando marcado) → concede/revoga a Área Administrativa
 *  - perfil_admin (administrador_global | staff | suporte) — MVP: só global
 *  - escopo       (global | programa | turma) — preparado, não usado no MVP
 *
 * A Área do Guerreiro é sempre habilitada (qualquer autenticado) e não exige
 * persistência. Atualiza menus/rotas imediatamente (revalidate do layout).
 */
export async function definirAcessoSistema(formData: FormData) {
  const { supabase, authUserId } = await gateAdmin();
  const userId = String(formData.get("user_id") ?? ""); // = public.users.id
  const querAdmin = formData.get("area_admin") != null; // checkbox marcado
  const perfilRaw = String(formData.get("perfil_admin") ?? "administrador_global");
  const escopoRaw = String(formData.get("escopo") ?? "global");

  const back = `/admin/guerreiros/${userId}`;
  const erroRedir = (msg: string): never => redirect(`${back}?erro=${encodeURIComponent(msg)}`);

  if (!userId) erroRedir("Usuário inválido.");

  // id de domínio do admin logado — impede auto-rebaixamento (evita lockout).
  const { data: meRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  const meuId = (meRow as { id: string } | null)?.id ?? null;

  // ---- Sem Área Administrativa: revoga a role global `admin`. ---------------
  if (!querAdmin) {
    if (meuId && meuId === userId)
      erroRedir("Você não pode remover o seu próprio acesso de administrador.");
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin")
      .eq("scope_type", "global");
    if (error) erroRedir(error.message);
    await audit("acesso_sistema_alterado", `user:${userId}`, { area_admin: false });
    revalidatePath(back);
    revalidatePath("/", "layout"); // menus/header refletem o novo acesso de imediato
    redirect(`${back}?ok=${encodeURIComponent("Acesso ao sistema atualizado.")}`);
  }

  // ---- Com Área Administrativa: valida perfil/escopo. -----------------------
  if (!PERFIS_ADMIN.includes(perfilRaw as PerfilAdmin)) erroRedir("Perfil administrativo inválido.");
  if (!ESCOPOS.includes(escopoRaw as Escopo)) erroRedir("Escopo inválido.");
  const perfil = perfilRaw as PerfilAdmin;

  // MVP: apenas Administrador Global é ligado. Staff/Suporte ficam preparados.
  if (!PERFIS_ATIVOS_MVP.includes(perfil))
    erroRedir("Perfil em preparação — somente Administrador Global está disponível no momento.");

  // Administrador Global = role global `admin` (idempotente).
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
  await audit("acesso_sistema_alterado", `user:${userId}`, {
    area_admin: true,
    perfil: "administrador_global",
    escopo: "global",
  });

  revalidatePath(back);
  revalidatePath("/", "layout"); // menus/header refletem o novo acesso de imediato
  redirect(`${back}?ok=${encodeURIComponent("Acesso ao sistema atualizado.")}`);
}
