"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { audit } from "@/lib/admin/audit";

type Origem = "cortesia" | "convite" | "offline" | "interno" | "teste";

async function assertAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "não autenticado" as const };
  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (!ehAdmin) return { supabase, error: "acesso negado" as const };
  return { supabase, error: null };
}

type SupabaseServer = Awaited<ReturnType<typeof createServerSupabase>>;

async function contarAtivasNaTurma(supabase: SupabaseServer, turmaId: string) {
  const { count } = await supabase
    .from("matriculas")
    .select("id", { count: "exact", head: true })
    .eq("turma_id", turmaId)
    .eq("status", "ativa");
  return count ?? 0;
}

/**
 * CAMINHO 2 — concessão manual. Sempre cria o entitlement (auditável). A criação
 * de matrícula segue a matriz aprovada (ponto 4) e a regra de 1 jornada ativa por
 * programa (ponto 3). Nunca reativa cancelada; nunca duplica concluída.
 */
export async function concederAcessoManual(input: {
  email: string;
  programaId: string;
  turmaId?: string | null;
  origem: Origem;
  motivo?: string;
}) {
  const { supabase, error } = await assertAdmin();
  if (error) return { error };

  const email = input.email.toLowerCase().trim();
  const turmaId = input.turmaId || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: adminRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user!.id)
    .maybeSingle();
  const grantedBy = (adminRow as { id: string } | null)?.id ?? null;

  // 1) entitlement sempre
  const { data: entRow, error: e1 } = await supabase
    .from("entitlements")
    .insert({
      email,
      programa_id: input.programaId,
      turma_id: turmaId,
      provider: "manual",
      origem: input.origem,
      granted_by: grantedBy,
      granted_reason: input.motivo ?? null,
      status: "ativo",
      valor_cents: 0,
    })
    .select("id")
    .single();
  if (e1) return { error: e1.message };
  const ent = entRow as { id: string };
  await audit("acesso_concedido", `entitlement:${ent.id}`, {
    email,
    programa_id: input.programaId,
    origem: input.origem,
  });

  // 2) matrícula conforme matriz
  if (!turmaId)
    return { ok: true, entitlementId: ent.id, aviso: "Entitlement criado; alocar turma depois." };

  const { data: uRow } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
  const u = uRow as { id: string } | null;
  if (!u)
    return {
      ok: true,
      entitlementId: ent.id,
      aviso: "Acesso registrado; matrícula será criada quando o guerreiro acessar.",
    };

  await supabase.from("entitlements").update({ user_id: u.id }).eq("id", ent.id);

  // matrícula existente na turma?
  const { data: existRow } = await supabase
    .from("matriculas")
    .select("id, status")
    .eq("user_id", u.id)
    .eq("turma_id", turmaId)
    .maybeSingle();
  const exist = existRow as { id: string; status: string } | null;
  if (exist) {
    if (exist.status === "cancelada")
      return {
        ok: true,
        entitlementId: ent.id,
        aviso: "Já existe matrícula cancelada nesta turma — reative manualmente.",
      };
    return {
      ok: true,
      entitlementId: ent.id,
      aviso: `Guerreiro já matriculado nesta turma (${exist.status}).`,
    };
  }

  // jornada ativa em outra turma do mesmo programa?
  const { data: ativasProg } = await supabase
    .from("matriculas")
    .select("id, turmas!inner(programa_id)")
    .eq("user_id", u.id)
    .eq("status", "ativa")
    .eq("turmas.programa_id", input.programaId);
  if ((ativasProg as unknown[] | null)?.length)
    return {
      ok: true,
      entitlementId: ent.id,
      aviso:
        "Guerreiro já possui matrícula ativa no programa — entitlement registrado, matrícula não criada.",
    };

  // capacidade
  const { data: turmaRow } = await supabase
    .from("turmas")
    .select("tamanho_max")
    .eq("id", turmaId)
    .maybeSingle();
  const tmax = (turmaRow as { tamanho_max: number | null } | null)?.tamanho_max ?? null;
  if (tmax !== null && (await contarAtivasNaTurma(supabase, turmaId)) >= tmax)
    return {
      ok: true,
      entitlementId: ent.id,
      aviso: "Turma lotada — entitlement registrado, matrícula não criada.",
    };

  const { error: e2 } = await supabase
    .from("matriculas")
    .insert({ user_id: u.id, turma_id: turmaId, entitlement_id: ent.id, status: "ativa" });
  if (e2) return { error: e2.message };
  await audit("matricula_criada", `matricula:${u.id}@${turmaId}`, {
    origem: "manual",
    entitlement_id: ent.id,
  });
  return { ok: true, entitlementId: ent.id, aviso: "Matrícula criada." };
}

export async function cancelarMatricula(matriculaId: string) {
  const { supabase, error } = await assertAdmin();
  if (error) return { error };
  const { error: e } = await supabase
    .from("matriculas")
    .update({ status: "cancelada" })
    .eq("id", matriculaId);
  if (e) return { error: e.message };
  await audit("matricula_cancelada", `matricula:${matriculaId}`, {});
  return { ok: true };
}

/** Reativação SOMENTE para matrícula cancelada. Concluída nunca reativa. */
export async function reativarMatricula(matriculaId: string) {
  const { supabase, error } = await assertAdmin();
  if (error) return { error };
  const { data: mRow } = await supabase
    .from("matriculas")
    .select("status")
    .eq("id", matriculaId)
    .maybeSingle();
  const status = (mRow as { status: string } | null)?.status;
  if (!status) return { error: "matrícula não encontrada" };
  if (status === "concluida") return { error: "matrícula concluída não pode ser reativada" };
  if (status === "ativa") return { error: "matrícula já está ativa" };
  const { error: e } = await supabase
    .from("matriculas")
    .update({ status: "ativa" })
    .eq("id", matriculaId);
  if (e) return { error: e.message };
  await audit("matricula_reativada", `matricula:${matriculaId}`, {});
  return { ok: true };
}

/**
 * Transferência (Opção B). Só matrícula ATIVA, mesma matrícula, turma destino do
 * mesmo programa, sem conflito, respeitando capacidade. Altera SOMENTE turma_id.
 */
export async function transferirMatricula(matriculaId: string, novaTurmaId: string) {
  const { supabase, error } = await assertAdmin();
  if (error) return { error };

  const { data: mRow } = await supabase
    .from("matriculas")
    .select("id, user_id, turma_id, status")
    .eq("id", matriculaId)
    .maybeSingle();
  const m = mRow as { id: string; user_id: string; turma_id: string; status: string } | null;
  if (!m) return { error: "matrícula não encontrada" };
  if (m.status !== "ativa") return { error: "somente matrícula ativa pode ser transferida" };
  if (m.turma_id === novaTurmaId) return { error: "turma de origem e destino são iguais" };

  const { data: tRows } = await supabase
    .from("turmas")
    .select("id, programa_id, tamanho_max")
    .in("id", [m.turma_id, novaTurmaId]);
  const turmas = (tRows ?? []) as { id: string; programa_id: string; tamanho_max: number | null }[];
  const atual = turmas.find((t) => t.id === m.turma_id);
  const nova = turmas.find((t) => t.id === novaTurmaId);
  if (!nova) return { error: "turma destino não encontrada" };
  if (!atual || atual.programa_id !== nova.programa_id)
    return { error: "transferência só dentro do mesmo programa" };

  const { data: conflito } = await supabase
    .from("matriculas")
    .select("id")
    .eq("user_id", m.user_id)
    .eq("turma_id", novaTurmaId)
    .maybeSingle();
  if (conflito) return { error: "já existe matrícula do participante na turma destino" };

  if (
    nova.tamanho_max !== null &&
    (await contarAtivasNaTurma(supabase, novaTurmaId)) >= nova.tamanho_max
  )
    return { error: "turma destino lotada" };

  const { error: e } = await supabase
    .from("matriculas")
    .update({ turma_id: novaTurmaId }) // só turma_id — preserva status/entitlement_id/histórico
    .eq("id", matriculaId);
  if (e) return { error: e.message };
  await audit("matricula_transferida", `matricula:${matriculaId}`, {
    de: m.turma_id,
    para: novaTurmaId,
  });
  return { ok: true };
}
