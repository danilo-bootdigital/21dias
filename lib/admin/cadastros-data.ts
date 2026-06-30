import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { nomeDeGuerreiro } from "@/lib/identity";

/**
 * Central de Cadastros — fonte única do estado operacional de cada pessoa.
 * Base em `users` (admin lê via RLS) para incluir QUEM SE CADASTROU pelo site e
 * ainda não tem perfil/matrícula. Tudo é DERIVADO de tabelas existentes
 * (matriculas, audit_log, auth.users) — nenhuma alteração de banco. Poucas
 * queries em LOTE (sem N+1).
 */
export type StatusOp =
  | "aguardando_matricula"
  | "convite_pendente"
  | "nunca_acessou"
  | "ativo"
  | "concluido"
  | "cancelado";

export const STATUS_META: Record<
  StatusOp,
  { dot: string; label: string; tone: "danger" | "warning" | "success" | "info" | "neutral"; passo: number }
> = {
  aguardando_matricula: { dot: "🔴", label: "Aguardando matrícula", tone: "danger", passo: 2 },
  convite_pendente: { dot: "🟠", label: "Convite pendente", tone: "warning", passo: 3 },
  nunca_acessou: { dot: "🟡", label: "Nunca acessou", tone: "warning", passo: 5 },
  ativo: { dot: "🟢", label: "Jornada ativa", tone: "success", passo: 6 },
  concluido: { dot: "🔵", label: "Concluído", tone: "info", passo: 7 },
  cancelado: { dot: "⚫", label: "Cancelado", tone: "neutral", passo: 0 },
};

/** Etapas do fluxo operacional (para o indicador visual de progresso). */
export const FLUXO = [
  "Cadastro",
  "Aguardando matrícula",
  "Matrícula",
  "Convite",
  "1º acesso",
  "Jornada ativa",
  "Concluído",
] as const;

export type CadastroRow = {
  userId: string;
  nome: string;
  temPerfil: boolean;
  cidade: string | null;
  email: string;
  foto: string | null;
  createdAt: string | null;
  programa: string | null;
  turma: string | null;
  ehAdmin: boolean;
  status: StatusOp;
  matriculaId: string | null; // matrícula mais recente (para ações de lifecycle)
  recente: boolean; // cadastro nas últimas 48h
};

export async function listarCadastros(agoraISO: string): Promise<CadastroRow[]> {
  const sb = await createServerSupabase();
  const agora = new Date(agoraISO).getTime();

  // Base: TODOS os usuários (admin lê via RLS users_read).
  const { data: usersRows } = await sb
    .from("users")
    .select("id, email, created_at")
    .order("created_at", { ascending: false });
  const usuarios = (usersRows ?? []) as { id: string; email: string; created_at: string | null }[];
  if (usuarios.length === 0) return [];
  const ids = usuarios.map((u) => u.id);

  // Perfil (nome/cidade/foto).
  const { data: perfRows } = await sb
    .from("guerreiro_profiles")
    .select("user_id, nome_guerreiro, cidade, foto_url")
    .in("user_id", ids);
  const perfil = new Map(
    ((perfRows ?? []) as { user_id: string; nome_guerreiro: string | null; cidade: string | null; foto_url: string | null }[]).map(
      (p) => [p.user_id, p],
    ),
  );

  // Matrícula mais recente por usuário (com turma + programa).
  const { data: matRows } = await sb
    .from("matriculas")
    .select("id, user_id, status, joined_at, turmas(codigo, programas(nome))")
    .in("user_id", ids)
    .order("joined_at", { ascending: false });
  const mats = (matRows ?? []) as unknown as {
    id: string;
    user_id: string;
    status: string;
    joined_at: string | null;
    turmas: { codigo: string; programas: { nome: string } | null } | null;
  }[];
  const matAtual = new Map<string, (typeof mats)[number]>();
  for (const m of mats) if (!matAtual.has(m.user_id)) matAtual.set(m.user_id, m);

  // Permissão admin.
  const { data: adminRows } = await sb
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .eq("scope_type", "global");
  const adminSet = new Set(((adminRows ?? []) as { user_id: string }[]).map((r) => r.user_id));

  // Convite enviado (audit_log).
  const { data: convRows } = await sb.from("audit_log").select("meta").eq("acao", "convite_matricula");
  const conviteSet = new Set<string>();
  for (const c of (convRows ?? []) as { meta: Record<string, unknown> | null }[]) {
    const uid = c.meta?.usuario_id as string | undefined;
    if (uid && c.meta?.status === "enviado") conviteSet.add(uid);
  }

  // Último acesso (auth.users via service-role). Best-effort.
  const ultimo = new Map<string, string | null>();
  try {
    const admin = createAdminSupabase();
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const porEmail = new Map<string, string | null>();
    for (const au of list?.users ?? [])
      if (au.email) porEmail.set(au.email.toLowerCase(), au.last_sign_in_at ?? null);
    for (const u of usuarios) ultimo.set(u.id, porEmail.get(u.email.toLowerCase()) ?? null);
  } catch {
    // sem service-role → "ativo" não pode ser distinguido de "nunca acessou".
  }

  return usuarios.map((u) => {
    const p = perfil.get(u.id);
    const m = matAtual.get(u.id);
    const logou = Boolean(ultimo.get(u.id));
    const convite = conviteSet.has(u.id);

    let status: StatusOp;
    if (m?.status === "concluida") status = "concluido";
    else if (m?.status === "ativa") status = logou ? "ativo" : convite ? "nunca_acessou" : "convite_pendente";
    else if (m?.status === "cancelada") status = "cancelado";
    else status = "aguardando_matricula"; // sem matrícula

    const createdMs = u.created_at ? new Date(u.created_at).getTime() : 0;
    return {
      userId: u.id,
      nome: nomeDeGuerreiro(p?.nome_guerreiro),
      temPerfil: Boolean(p),
      cidade: p?.cidade ?? null,
      email: u.email,
      foto: p?.foto_url ?? null,
      createdAt: u.created_at,
      programa: m?.turmas?.programas?.nome ?? null,
      turma: m?.turmas?.codigo ?? null,
      ehAdmin: adminSet.has(u.id),
      status,
      matriculaId: m?.id ?? null,
      recente: createdMs > 0 && agora - createdMs < 48 * 3600 * 1000,
    };
  });
}

/** Filtros disponíveis (chave de URL → predicado). */
export const FILTROS: { key: string; label: string; test: (s: StatusOp) => boolean }[] = [
  { key: "todos", label: "Todos", test: () => true },
  {
    key: "pendentes",
    label: "Pendentes",
    test: (s) => s === "aguardando_matricula" || s === "convite_pendente" || s === "nunca_acessou",
  },
  { key: "aguardando_matricula", label: "Aguardando matrícula", test: (s) => s === "aguardando_matricula" },
  { key: "convite_pendente", label: "Convite pendente", test: (s) => s === "convite_pendente" },
  { key: "nunca_acessou", label: "Nunca acessaram", test: (s) => s === "nunca_acessou" },
  { key: "ativo", label: "Ativos", test: (s) => s === "ativo" },
  { key: "concluido", label: "Concluídos", test: (s) => s === "concluido" },
  { key: "cancelado", label: "Cancelados", test: (s) => s === "cancelado" },
];
