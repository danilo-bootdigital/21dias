import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { nomeDeGuerreiro } from "@/lib/identity";

/**
 * Lista de Guerreiros para o admin — montagem em poucas queries em LOTE (sem
 * N+1). Reusa as tabelas/regras existentes; nenhuma escrita. "Último acesso" vem
 * de auth.users (via service-role) e "Convite enviado" do audit_log.
 */
export type GuerreiroLista = {
  userId: string;
  nome: string;
  cidade: string | null;
  email: string;
  programa: string | null;
  turma: string | null;
  statusMatricula: string | null;
  ultimoAcesso: string | null;
  ehAdmin: boolean;
  conviteEnviado: boolean;
};

export async function listarGuerreiros(q?: string): Promise<GuerreiroLista[]> {
  const sb = await createServerSupabase();

  const { data: perfis } = await sb
    .from("guerreiro_profiles")
    .select("user_id, nome_guerreiro, cidade, users(email)")
    .order("nome_guerreiro");
  let base = (perfis ?? []) as unknown as {
    user_id: string;
    nome_guerreiro: string;
    cidade: string | null;
    users: { email: string } | null;
  }[];

  if (q) {
    const t = q.toLowerCase();
    base = base.filter(
      (r) =>
        r.nome_guerreiro?.toLowerCase().includes(t) ||
        r.cidade?.toLowerCase().includes(t) ||
        r.users?.email?.toLowerCase().includes(t),
    );
  }
  if (base.length === 0) return [];

  const ids = base.map((b) => b.user_id);

  // Matrícula "atual" (mais recente) por guerreiro, com turma + programa.
  const { data: matsRow } = await sb
    .from("matriculas")
    .select("user_id, status, joined_at, turmas(codigo, programas(nome))")
    .in("user_id", ids)
    .order("joined_at", { ascending: false });
  const mats = (matsRow ?? []) as unknown as {
    user_id: string;
    status: string;
    joined_at: string | null;
    turmas: { codigo: string; programas: { nome: string } | null } | null;
  }[];
  const matAtual = new Map<string, (typeof mats)[number]>();
  for (const m of mats) if (!matAtual.has(m.user_id)) matAtual.set(m.user_id, m); // 1ª = mais recente

  // Permissão administrativa.
  const { data: adminRows } = await sb
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .eq("scope_type", "global");
  const adminSet = new Set(((adminRows ?? []) as { user_id: string }[]).map((r) => r.user_id));

  // Convite enviado (audit_log).
  const { data: convRows } = await sb
    .from("audit_log")
    .select("meta")
    .eq("acao", "convite_matricula");
  const conviteSet = new Set<string>();
  for (const c of (convRows ?? []) as { meta: Record<string, unknown> | null }[]) {
    const uid = c.meta?.usuario_id as string | undefined;
    if (uid && c.meta?.status === "enviado") conviteSet.add(uid);
  }

  // Último acesso (auth.users via service-role). Best-effort: se falhar, fica "—".
  const ultimo = new Map<string, string | null>();
  try {
    const admin = createAdminSupabase();
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const porEmail = new Map<string, string | null>();
    for (const u of list?.users ?? [])
      if (u.email) porEmail.set(u.email.toLowerCase(), u.last_sign_in_at ?? null);
    for (const b of base) {
      const e = b.users?.email?.toLowerCase();
      if (e) ultimo.set(b.user_id, porEmail.get(e) ?? null);
    }
  } catch {
    // sem service-role disponível → "Último acesso" indisponível.
  }

  return base.map((b) => {
    const m = matAtual.get(b.user_id);
    return {
      userId: b.user_id,
      nome: nomeDeGuerreiro(b.nome_guerreiro),
      cidade: b.cidade,
      email: b.users?.email ?? "",
      programa: m?.turmas?.programas?.nome ?? null,
      turma: m?.turmas?.codigo ?? null,
      statusMatricula: m?.status ?? null,
      ultimoAcesso: ultimo.get(b.user_id) ?? null,
      ehAdmin: adminSet.has(b.user_id),
      conviteEnviado: conviteSet.has(b.user_id),
    };
  });
}
