"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { enviarConviteMatricula } from "@/lib/email/enviar-convite-matricula";
import { nomeDeGuerreiro } from "@/lib/identity";
import { audit } from "@/lib/admin/audit";

/**
 * Ações da tela única "Editar Guerreiro". Reaproveitam tabelas/regras existentes;
 * editar o perfil de OUTRO usuário usa o client service-role (RLS de perfil é
 * own-only). Lifecycle de matrícula e concessão de acesso ficam em access.ts/
 * forms.ts (reusados na própria tela). Não duplica regra de matrícula/acesso.
 */
const URL_ACESSO = "https://app.codigo21.com.br";

async function gateAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (!ehAdmin) redirect("/perfil");
  return supabase;
}

/** Edita dados pessoais (nome/cidade/foto) de um Guerreiro. */
export async function editarGuerreiroPerfil(formData: FormData) {
  await gateAdmin();
  const admin = createAdminSupabase();

  const userId = String(formData.get("user_id") ?? "");
  const nome = String(formData.get("nome_guerreiro") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim() || null;
  const foto = formData.get("foto");
  const back = `/admin/guerreiros/${userId}`;
  const erro = (msg: string): never => redirect(`${back}?erro=${encodeURIComponent(msg)}`);

  if (!userId) erro("Usuário inválido.");
  if (!nome) erro("Informe o nome do Guerreiro.");

  let fotoUrl: string | null = null;
  if (foto instanceof File && foto.size > 0) {
    try {
      const ext = (foto.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const caminho = `${userId}/avatar.${ext || "jpg"}`;
      const buf = new Uint8Array(await foto.arrayBuffer());
      const up = await admin.storage
        .from("avatars")
        .upload(caminho, buf, { contentType: foto.type || "image/jpeg", upsert: true });
      if (!up.error) fotoUrl = admin.storage.from("avatars").getPublicUrl(caminho).data.publicUrl ?? null;
    } catch {
      fotoUrl = null;
    }
  }

  const { error } = await admin.from("guerreiro_profiles").upsert(
    { user_id: userId, nome_guerreiro: nome, cidade, ...(fotoUrl ? { foto_url: fotoUrl } : {}) },
    { onConflict: "user_id" },
  );
  if (error) erro(error.message);

  await audit("guerreiro_editado", `user:${userId}`, { campos: "dados_pessoais" });
  revalidatePath(back);
  revalidatePath("/", "layout");
  redirect(`${back}?ok=${encodeURIComponent("Dados atualizados.")}`);
}

/**
 * Exclui um Guerreiro DEFINITIVAMENTE. Remove o usuário de auth (service-role),
 * o que cascateia public.users → perfil, matrículas, check-ins, conquistas,
 * notificações e roles. Entitlements/audit_log são preservados (SET NULL).
 * Protege contra auto-exclusão (evita lockout do próprio admin).
 */
export async function excluirGuerreiro(formData: FormData) {
  const sb = await gateAdmin();
  const admin = createAdminSupabase();
  const userId = String(formData.get("user_id") ?? "");
  const back = String(formData.get("back") || "/admin/guerreiros");
  const erro = (msg: string): never => redirect(`${back}?erro=${encodeURIComponent(msg)}`);
  if (!userId) erro("Usuário inválido.");

  // Impede excluir o próprio usuário logado.
  const {
    data: { user },
  } = await sb.auth.getUser();
  const { data: meRow } = user
    ? await sb.from("users").select("id").eq("auth_user_id", user.id).maybeSingle()
    : { data: null };
  if ((meRow as { id: string } | null)?.id === userId)
    erro("Você não pode excluir o seu próprio usuário.");

  const { data: uRow } = await sb
    .from("users")
    .select("auth_user_id, email")
    .eq("id", userId)
    .maybeSingle();
  const u = uRow as { auth_user_id: string; email: string } | null;
  if (!u) erro("Guerreiro não encontrado.");

  const { error } = await admin.auth.admin.deleteUser(u!.auth_user_id);
  if (error) erro(`Não foi possível excluir: ${error.message}`);

  await audit("guerreiro_excluido", `user:${userId}`, { email: u!.email });
  revalidatePath("/admin/guerreiros");
  redirect(`${back}?ok=${encodeURIComponent("Guerreiro excluído.")}`);
}

/** Reenvia o e-mail de convite (reusa o fluxo existente) para a matrícula mais recente. */
export async function reenviarConvite(formData: FormData) {
  const sb = await gateAdmin();
  const userId = String(formData.get("user_id") ?? "");
  // Destino de retorno opcional (ex.: a Central). Default: a tela do guerreiro.
  const back = String(formData.get("back") || `/admin/guerreiros/${userId}`);
  const erro = (msg: string): never => redirect(`${back}?erro=${encodeURIComponent(msg)}`);
  if (!userId) erro("Usuário inválido.");

  const { data: uRow } = await sb
    .from("users")
    .select("email, guerreiro_profiles(nome_guerreiro)")
    .eq("id", userId)
    .maybeSingle();
  const u = uRow as
    | { email: string; guerreiro_profiles: { nome_guerreiro: string | null } | null }
    | null;
  if (!u?.email) erro("Guerreiro sem e-mail cadastrado.");

  const { data: mRow } = await sb
    .from("matriculas")
    .select("id, turmas(programas(nome))")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const m = mRow as { id: string; turmas: { programas: { nome: string } | null } | null } | null;
  if (!m) erro("Guerreiro ainda não possui matrícula para reenviar o convite.");
  const mat = m!;

  const programa = mat.turmas?.programas?.nome ?? "CÓDIGO 21";
  const r = await enviarConviteMatricula({
    nome: nomeDeGuerreiro(u!.guerreiro_profiles?.nome_guerreiro),
    email: u!.email,
    programa,
    urlAcesso: URL_ACESSO,
    matriculaId: mat.id,
    usuarioId: userId,
  });
  await audit("convite_matricula", `matricula:${mat.id}`, {
    tipo_evento: "convite_matricula",
    usuario_id: userId,
    email: u!.email,
    status: r.ok ? "enviado" : "erro",
    ...(r.error ? { erro: r.error } : {}),
  });

  revalidatePath(back);
  if (!r.ok) erro("Não foi possível reenviar o convite agora. Tente novamente.");
  redirect(`${back}?ok=${encodeURIComponent("Convite reenviado por e-mail.")}`);
}
