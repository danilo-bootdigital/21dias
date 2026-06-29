"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { concederAcessoManual } from "@/lib/admin/access";
import { enviarConviteMatricula } from "@/lib/email/enviar-convite-matricula";
import { nomeDeGuerreiro } from "@/lib/identity";
import { audit } from "@/lib/admin/audit";

/**
 * "Novo Guerreiro" — orquestra TODO o cadastro num clique, reaproveitando a
 * lógica existente (NÃO duplica regras nem altera as actions originais):
 *
 *   1) verifica usuário por e-mail
 *   2) cria o usuário (service-role) se não existir   → trigger cria public.users
 *   3) cria/atualiza o perfil do Guerreiro (service-role; RLS de perfil é own-only)
 *   4) permissão admin (opcional) — role global `admin` (mesma regra do RBAC)
 *   5) concederAcessoManual() → entitlement + matrícula + programa + turma
 *      (reusa 1-jornada-por-programa, capacidade, duplicata, audit)
 *   6) forma de acesso: enviar convite (e-mail existente) | criar acesso | gerar link
 *
 * Conceitos técnicos (entitlement/matrícula/role) ficam ocultos para o admin.
 */
const URL_ACESSO = "https://app.codigo21.com.br";
const FORMAS = ["convite", "criar", "link"] as const;
type Forma = (typeof FORMAS)[number];

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

export async function criarGuerreiro(formData: FormData) {
  const supabase = await gateAdmin();
  const admin = createAdminSupabase();

  const nome = String(formData.get("nome_guerreiro") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const cidade = String(formData.get("cidade") ?? "").trim() || null;
  const programaId = String(formData.get("programaId") ?? "");
  const turmaId = String(formData.get("turmaId") ?? "");
  const querAdmin = formData.get("area_admin") != null;
  const formaRaw = String(formData.get("forma") ?? "convite");
  const forma: Forma = (FORMAS as readonly string[]).includes(formaRaw)
    ? (formaRaw as Forma)
    : "convite";
  const foto = formData.get("foto");

  const back = "/admin/guerreiros/novo";
  const erro = (msg: string): never => redirect(`${back}?erro=${encodeURIComponent(msg)}`);

  if (!nome) erro("Informe o nome do Guerreiro.");
  if (!email || !email.includes("@")) erro("Informe um e-mail válido.");
  if (!programaId) erro("Selecione o programa.");
  if (!turmaId) erro("Selecione a turma.");

  // 1) usuário já existe? (public.users por e-mail)
  const { data: jaRow } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  let userId = (jaRow as { id: string } | null)?.id ?? null;

  // 2) criar o usuário (auth) se necessário — trigger handle_new_user cria public.users.
  if (!userId) {
    const { error: eCreate } = await admin.auth.admin.createUser({
      email,
      email_confirm: true, // acesso definido por convite/link/recuperação de senha
    });
    if (eCreate && !/already been registered|already exists/i.test(eCreate.message))
      erro(`Não foi possível criar o usuário: ${eCreate.message}`);

    // re-resolve o id de domínio (criado pelo trigger).
    const { data: novoRow } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    userId = (novoRow as { id: string } | null)?.id ?? null;
    if (!userId) erro("Usuário criado, mas a sincronização ainda não refletiu. Tente novamente.");
  }
  const uid = userId as string;

  // 2b) foto (opcional) — upload best-effort via service-role no bucket avatars.
  let fotoUrl: string | null = null;
  if (foto instanceof File && foto.size > 0) {
    try {
      const ext = (foto.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const caminho = `${uid}/avatar.${ext || "jpg"}`;
      const buf = new Uint8Array(await foto.arrayBuffer());
      const up = await admin.storage
        .from("avatars")
        .upload(caminho, buf, { contentType: foto.type || "image/jpeg", upsert: true });
      if (!up.error) {
        const { data: pub } = admin.storage.from("avatars").getPublicUrl(caminho);
        fotoUrl = pub.publicUrl ?? null;
      }
    } catch {
      fotoUrl = null; // foto é secundária — nunca bloqueia o cadastro.
    }
  }

  // 3) perfil do Guerreiro (service-role: RLS de guerreiro_profiles é own-only).
  const { error: ePerfil } = await admin.from("guerreiro_profiles").upsert(
    { user_id: uid, nome_guerreiro: nome, cidade, ...(fotoUrl ? { foto_url: fotoUrl } : {}) },
    { onConflict: "user_id" },
  );
  if (ePerfil) erro(`Usuário criado, mas falhou ao salvar o perfil: ${ePerfil.message}`);

  // 4) permissão administrativa (opcional) — role global `admin` idempotente (mesma
  //    regra de lib/admin/roles.ts). A Área do Guerreiro é implícita (autenticado).
  if (querAdmin) {
    const { data: jaAdmin } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", uid)
      .eq("role", "admin")
      .eq("scope_type", "global")
      .is("scope_id", null)
      .maybeSingle();
    if (!jaAdmin)
      await supabase
        .from("user_roles")
        .insert({ user_id: uid, role: "admin", scope_type: "global", scope_id: null });
  }

  // 5) acesso + matrícula (reusa TODAS as regras homologadas).
  const origem = forma === "convite" ? "convite" : "interno";
  const r = await concederAcessoManual({ email, programaId, turmaId, origem });
  if ("error" in r && r.error) erro(`Acesso/matrícula: ${r.error}`);

  await audit("guerreiro_criado", `user:${uid}`, { email, programa_id: programaId, turma_id: turmaId });

  // 6) forma de acesso.
  let extra = "";
  if (forma === "convite") {
    const { data: mRow } = await supabase
      .from("matriculas")
      .select("id")
      .eq("user_id", uid)
      .eq("turma_id", turmaId)
      .maybeSingle();
    const matriculaId = (mRow as { id: string } | null)?.id ?? "";
    const { data: pRow } = await supabase
      .from("programas")
      .select("nome")
      .eq("id", programaId)
      .maybeSingle();
    const programa = (pRow as { nome: string } | null)?.nome ?? "CÓDIGO 21";
    try {
      const env = await enviarConviteMatricula({
        nome: nomeDeGuerreiro(nome),
        email,
        programa,
        urlAcesso: URL_ACESSO,
        matriculaId,
        usuarioId: uid,
      });
      await audit("convite_matricula", `matricula:${matriculaId}`, {
        tipo_evento: "convite_matricula",
        usuario_id: uid,
        email,
        status: env.ok ? "enviado" : "erro",
        ...(env.error ? { erro: env.error } : {}),
      });
      extra = env.ok
        ? " O convite foi enviado por e-mail."
        : " Porém o e-mail de convite falhou — o Guerreiro pode entrar com “Esqueci minha senha”.";
    } catch {
      extra = " Porém o e-mail de convite falhou — o Guerreiro pode entrar com “Esqueci minha senha”.";
    }
  } else if (forma === "link") {
    try {
      const { data: link } = await admin.auth.admin.generateLink({ type: "recovery", email });
      const url = link?.properties?.action_link ?? "";
      extra = url ? ` Link de acesso (copie e envie ao Guerreiro): ${url}` : "";
    } catch {
      extra = "";
    }
  } else {
    extra = " Acesso criado — o Guerreiro define a senha em “Esqueci minha senha”.";
  }

  revalidatePath("/admin/guerreiros");
  redirect(
    `/admin/guerreiros?ok=${encodeURIComponent(`Guerreiro ${nomeDeGuerreiro(nome)} cadastrado com sucesso.${extra}`)}`,
  );
}
