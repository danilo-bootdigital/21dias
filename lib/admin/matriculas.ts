"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { audit } from "@/lib/admin/audit";
import { nomeDeGuerreiro } from "@/lib/identity";
import { enviarConviteMatricula } from "@/lib/email/enviar-convite-matricula";

// URL oficial de acesso (pública).
const URL_ACESSO = "https://app.codigo21.com.br";

// ---------------------------------------------------------------------------
// Cadastro MANUAL de matrícula (admin). Reutiliza a tabela `matriculas` e as
// regras homologadas (sem migration, sem alterar RLS):
//  - matriculas_admin (ALL, is_admin()) permite o insert pelo admin;
//  - unique(user_id, turma_id) evita duplicata na mesma turma;
//  - regra "1 jornada ativa por programa" (igual a concederAcessoManual);
//  - turma encerrada/arquivada não aceita matrícula;
//  - capacidade (tamanho_max) respeitada para matrícula ativa.
// pontuacao_agregada NÃO é criada aqui: o scoring engine (recalc_pontuacao)
// já a cria/atualiza de forma idempotente (on conflict do update) na primeira
// atividade, e o acesso a /dashboard depende apenas de matrícula ATIVA.
// ---------------------------------------------------------------------------

const STATUS_VALIDOS = ["ativa", "concluida", "cancelada"] as const;
type StatusMatricula = (typeof STATUS_VALIDOS)[number];

async function gateAdmin() {
  const supabase = await createServerSupabase();
  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (!ehAdmin) redirect("/perfil");
  return supabase;
}

export async function criarMatriculaManual(formData: FormData) {
  const sb = await gateAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const turmaId = String(formData.get("turma_id") ?? "");
  const statusRaw = String(formData.get("status") ?? "ativa");
  const back = "/admin/matriculas/nova";
  const erroRedir = (msg: string): never => redirect(`${back}?erro=${encodeURIComponent(msg)}`);

  if (!userId) erroRedir("Selecione o guerreiro.");
  if (!turmaId) erroRedir("Selecione a turma.");
  if (!STATUS_VALIDOS.includes(statusRaw as StatusMatricula)) erroRedir("Status inválido.");
  const status = statusRaw as StatusMatricula;

  // Turma precisa existir e não estar encerrada/arquivada.
  const { data: tRow } = await sb
    .from("turmas")
    .select("id, status, programa_id, tamanho_max")
    .eq("id", turmaId)
    .maybeSingle();
  const turma = tRow as {
    id: string;
    status: string;
    programa_id: string;
    tamanho_max: number | null;
  } | null;
  if (!turma) return erroRedir("Turma não encontrada.");
  if (turma.status === "encerrada" || turma.status === "arquivada")
    erroRedir("Não é possível matricular em turma encerrada ou arquivada.");

  // Sem duplicata na mesma turma (unique user_id+turma_id).
  const { data: dupRow } = await sb
    .from("matriculas")
    .select("id, status")
    .eq("user_id", userId)
    .eq("turma_id", turmaId)
    .maybeSingle();
  const dup = dupRow as { id: string; status: string } | null;
  if (dup) {
    if (dup.status === "cancelada")
      erroRedir(
        "Já existe matrícula cancelada deste guerreiro nesta turma — reative-a na lista em vez de criar outra.",
      );
    erroRedir(`Guerreiro já matriculado nesta turma (status: ${dup.status}).`);
  }

  // Regras que só valem para matrícula ATIVA.
  if (status === "ativa") {
    // 1 jornada ativa por programa (regra homologada do sistema).
    const { data: ativasProg } = await sb
      .from("matriculas")
      .select("id, turmas!inner(programa_id)")
      .eq("user_id", userId)
      .eq("status", "ativa")
      .eq("turmas.programa_id", turma.programa_id);
    if ((ativasProg as unknown[] | null)?.length)
      erroRedir(
        "Guerreiro já possui matrícula ativa neste programa. Cancele ou transfira a matrícula atual antes de criar outra.",
      );

    // Capacidade da turma.
    if (turma.tamanho_max !== null) {
      const { count } = await sb
        .from("matriculas")
        .select("id", { count: "exact", head: true })
        .eq("turma_id", turmaId)
        .eq("status", "ativa");
      if ((count ?? 0) >= turma.tamanho_max) erroRedir("Turma lotada (capacidade máxima atingida).");
    }
  }

  const { data: ins, error } = await sb
    .from("matriculas")
    .insert({ user_id: userId, turma_id: turmaId, status })
    .select("id")
    .single();
  if (error) {
    if (error.message.includes("matriculas_user_id_turma_id_key"))
      erroRedir("Guerreiro já matriculado nesta turma.");
    erroRedir(error.message);
  }
  const id = (ins as { id: string }).id;

  await audit("matricula_criada_manual", `matricula:${id}`, {
    user_id: userId,
    turma_id: turmaId,
    status,
  });

  // E-mail de convite — SOMENTE na criação inicial. Operação SECUNDÁRIA:
  // nunca desfaz nem bloqueia a matrícula; falha vira sucesso parcial + log.
  let conviteEnviado = false;
  try {
    const { data: uRow } = await sb
      .from("users")
      .select("email, guerreiro_profiles(nome_guerreiro)")
      .eq("id", userId)
      .maybeSingle();
    const u = uRow as
      | { email: string; guerreiro_profiles: { nome_guerreiro: string | null } | null }
      | null;
    const { data: pRow } = await sb
      .from("programas")
      .select("nome")
      .eq("id", turma.programa_id)
      .maybeSingle();
    const programa = (pRow as { nome: string } | null)?.nome ?? "CÓDIGO 21";
    const email = u?.email ?? "";

    if (email) {
      const r = await enviarConviteMatricula({
        nome: nomeDeGuerreiro(u?.guerreiro_profiles?.nome_guerreiro),
        email,
        programa,
        urlAcesso: URL_ACESSO,
        matriculaId: id,
        usuarioId: userId,
      });
      conviteEnviado = r.ok;
      await audit("convite_matricula", `matricula:${id}`, {
        tipo_evento: "convite_matricula",
        usuario_id: userId,
        email,
        status: r.ok ? "enviado" : "erro",
        ...(r.error ? { erro: r.error } : {}),
      });
    } else {
      await audit("convite_matricula", `matricula:${id}`, {
        tipo_evento: "convite_matricula",
        usuario_id: userId,
        email: "",
        status: "erro",
        erro: "sem_email",
      });
    }
  } catch (e) {
    conviteEnviado = false;
    try {
      await audit("convite_matricula", `matricula:${id}`, {
        tipo_evento: "convite_matricula",
        usuario_id: userId,
        status: "erro",
        erro: e instanceof Error ? e.message : "erro_desconhecido",
      });
    } catch {
      // log seguro: se até o audit falhar, ignoramos — a matrícula está criada.
    }
  }

  revalidatePath("/admin/matriculas");
  const msg = conviteEnviado
    ? "Matrícula criada com sucesso. O convite foi enviado para o e-mail do guerreiro."
    : "Matrícula criada com sucesso, porém não foi possível enviar o e-mail de convite. O guerreiro poderá acessar a plataforma usando a opção Esqueci minha senha.";
  redirect(`/admin/matriculas?ok=${encodeURIComponent(msg)}`);
}
