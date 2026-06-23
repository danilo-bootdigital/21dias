import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Leituras administrativas de Programas (tela /admin/programas e detalhes).
// Apenas SELECTs — server actions ficam em lib/admin/programas.ts.
// ---------------------------------------------------------------------------

export type StatusPrograma = "rascunho" | "publicado" | "arquivado";

export type ProgramaAdmin = {
  id: string;
  nome: string;
  descricao: string | null;
  duracao_dias: number;
  is_publicado: boolean;
  arquivado_at: string | null;
  updated_at: string | null;
  temporada_id: string;
  temporada_nome: string | null;
  temporada_ano: number | null;
  fases: number;
  dias: number;
  status: StatusPrograma;
};

export function statusPrograma(p: {
  is_publicado: boolean;
  arquivado_at: string | null;
}): StatusPrograma {
  if (p.arquivado_at) return "arquivado";
  return p.is_publicado ? "publicado" : "rascunho";
}

/** Lista todos os programas com contagens de fases/dias e temporada, para a tabela admin. */
export async function listarProgramasAdmin(): Promise<ProgramaAdmin[]> {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("programas")
    .select(
      "id, nome, descricao, duracao_dias, is_publicado, arquivado_at, updated_at, temporada_id, temporadas(nome, ano), programa_fases(count), protocolo_dias(count)",
    )
    .order("arquivado_at", { ascending: true, nullsFirst: true })
    .order("nome");
  const rows = (data ?? []) as unknown as {
    id: string;
    nome: string;
    descricao: string | null;
    duracao_dias: number;
    is_publicado: boolean;
    arquivado_at: string | null;
    updated_at: string | null;
    temporada_id: string;
    temporadas: { nome: string; ano: number } | null;
    programa_fases: { count: number }[];
    protocolo_dias: { count: number }[];
  }[];
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    descricao: r.descricao,
    duracao_dias: r.duracao_dias,
    is_publicado: r.is_publicado,
    arquivado_at: r.arquivado_at,
    updated_at: r.updated_at,
    temporada_id: r.temporada_id,
    temporada_nome: r.temporadas?.nome ?? null,
    temporada_ano: r.temporadas?.ano ?? null,
    fases: r.programa_fases?.[0]?.count ?? 0,
    dias: r.protocolo_dias?.[0]?.count ?? 0,
    status: statusPrograma(r),
  }));
}

/** Temporadas para popular o <select> dos formulários de programa. */
export async function temporadasSelect(): Promise<{ id: string; nome: string; ano: number }[]> {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("temporadas")
    .select("id, nome, ano")
    .order("ano", { ascending: false });
  return (data ?? []) as { id: string; nome: string; ano: number }[];
}

/** Programa completo (inclui arquivado_at/updated_at) para a página de edição/detalhe. */
export async function obterProgramaAdmin(id: string) {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("programas")
    .select(
      "id, nome, descricao, duracao_dias, is_publicado, arquivado_at, updated_at, temporada_id",
    )
    .eq("id", id)
    .maybeSingle();
  return data as {
    id: string;
    nome: string;
    descricao: string | null;
    duracao_dias: number;
    is_publicado: boolean;
    arquivado_at: string | null;
    updated_at: string | null;
    temporada_id: string;
  } | null;
}

/** Contagens para a página de detalhes (fases, dias, conteúdos). */
export async function contagensPrograma(id: string) {
  const sb = await createServerSupabase();
  const [{ count: fases }, { data: diasData }] = await Promise.all([
    sb.from("programa_fases").select("id", { count: "exact", head: true }).eq("programa_id", id),
    sb.from("protocolo_dias").select("protocolo_conteudos(count)").eq("programa_id", id),
  ]);
  const dias = (diasData ?? []) as unknown as { protocolo_conteudos: { count: number }[] }[];
  const conteudos = dias.reduce((s, d) => s + (d.protocolo_conteudos?.[0]?.count ?? 0), 0);
  return { fases: fases ?? 0, dias: dias.length, conteudos };
}
