import "server-only";
import type { createServerSupabase } from "@/lib/supabase/server";
import { mensagemAmigavel } from "@/lib/admin/protocolo-data";

type SupabaseServer = Awaited<ReturnType<typeof createServerSupabase>>;

export type ResultadoClone = { ok: true; novoId: string } | { ok: false; erro: string };

/**
 * Cópia profunda de um programa: fases → dias (remapeando fase) → conteúdos
 * (remapeando dia) → hábitos. O novo programa nasce SEMPRE como rascunho
 * (is_publicado=false, arquivado_at=null), de modo que os locks da FASE B
 * (0010) ficam inativos por não haver turma iniciada.
 *
 * NÃO copia: turmas, matrículas, check-ins, pontuação, rankings, encerramentos,
 * certificados, hall nem conquistas.
 *
 * Em qualquer falha, remove o programa parcial (cascade nas filhas) e devolve
 * um erro amigável. Não faz redirect/auditoria — isso fica a cargo do chamador
 * (cada ponto de entrada audita com o evento adequado).
 */
export async function clonarProgramaCompleto(
  sb: SupabaseServer,
  origemId: string,
  novoNome: string,
): Promise<ResultadoClone> {
  const { data: origemRow } = await sb
    .from("programas")
    .select("id, temporada_id, descricao, duracao_dias")
    .eq("id", origemId)
    .maybeSingle();
  const origem = origemRow as {
    id: string;
    temporada_id: string;
    descricao: string | null;
    duracao_dias: number;
  } | null;
  if (!origem) return { ok: false, erro: "Programa de origem não encontrado." };

  // 1) novo programa (rascunho, sem turma → locks inativos)
  const { data: novoRow, error: e0 } = await sb
    .from("programas")
    .insert({
      temporada_id: origem.temporada_id,
      nome: novoNome,
      descricao: origem.descricao,
      duracao_dias: origem.duracao_dias,
      is_publicado: false,
    })
    .select("id")
    .single();
  if (e0) return { ok: false, erro: mensagemAmigavel(e0.message) };
  const novoId = (novoRow as { id: string }).id;

  try {
    // 2) fases (mapa antigo -> novo)
    const { data: fasesData } = await sb
      .from("programa_fases")
      .select("id, ordem, nome, descricao")
      .eq("programa_id", origemId)
      .order("ordem");
    const fases = (fasesData ?? []) as {
      id: string;
      ordem: number;
      nome: string;
      descricao: string | null;
    }[];
    const mapaFase = new Map<string, string>();
    for (const f of fases) {
      const { data: nf, error } = await sb
        .from("programa_fases")
        .insert({ programa_id: novoId, ordem: f.ordem, nome: f.nome, descricao: f.descricao })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      mapaFase.set(f.id, (nf as { id: string }).id);
    }

    // 3) dias (remapeia fase_id; mapa antigo -> novo)
    const { data: diasData } = await sb
      .from("protocolo_dias")
      .select(
        "id, numero, fase_id, missao_titulo, missao_descricao, missao_pontos, titulo, instrucoes, eh_marco, marco_titulo, marco_descricao",
      )
      .eq("programa_id", origemId)
      .order("numero");
    const dias = (diasData ?? []) as {
      id: string;
      numero: number;
      fase_id: string;
      missao_titulo: string;
      missao_descricao: string | null;
      missao_pontos: number;
      titulo: string | null;
      instrucoes: string | null;
      eh_marco: boolean;
      marco_titulo: string | null;
      marco_descricao: string | null;
    }[];
    const mapaDia = new Map<string, string>();
    for (const d of dias) {
      const { data: nd, error } = await sb
        .from("protocolo_dias")
        .insert({
          programa_id: novoId,
          numero: d.numero,
          fase_id: mapaFase.get(d.fase_id),
          missao_titulo: d.missao_titulo,
          missao_descricao: d.missao_descricao,
          missao_pontos: d.missao_pontos,
          titulo: d.titulo,
          instrucoes: d.instrucoes,
          eh_marco: d.eh_marco,
          marco_titulo: d.marco_titulo,
          marco_descricao: d.marco_descricao,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      mapaDia.set(d.id, (nd as { id: string }).id);
    }

    // 4) conteúdos (remapeia dia_id)
    const origemDiaIds = Array.from(mapaDia.keys());
    if (origemDiaIds.length) {
      const { data: contData } = await sb
        .from("protocolo_conteudos")
        .select("dia_id, ordem, tipo, titulo, corpo")
        .in("dia_id", origemDiaIds);
      const conts = (contData ?? []) as {
        dia_id: string;
        ordem: number;
        tipo: string;
        titulo: string | null;
        corpo: string;
      }[];
      if (conts.length) {
        const linhas = conts.map((c) => ({
          dia_id: mapaDia.get(c.dia_id),
          ordem: c.ordem,
          tipo: c.tipo,
          titulo: c.titulo,
          corpo: c.corpo,
        }));
        const { error } = await sb.from("protocolo_conteudos").insert(linhas);
        if (error) throw new Error(error.message);
      }
    }

    // 5) hábitos
    const { data: habData } = await sb
      .from("habitos_definicao")
      .select("nome, descricao, ordem, pontos")
      .eq("programa_id", origemId)
      .order("ordem");
    const habs = (habData ?? []) as {
      nome: string;
      descricao: string | null;
      ordem: number;
      pontos: number;
    }[];
    if (habs.length) {
      const linhas = habs.map((h) => ({
        programa_id: novoId,
        nome: h.nome,
        descricao: h.descricao,
        ordem: h.ordem,
        pontos: h.pontos,
      }));
      const { error } = await sb.from("habitos_definicao").insert(linhas);
      if (error) throw new Error(error.message);
    }
  } catch (e) {
    // cleanup: remove o programa parcial (on delete cascade nas filhas)
    await sb.from("programas").delete().eq("id", novoId);
    const msg = e instanceof Error ? e.message : "Falha ao clonar.";
    return { ok: false, erro: mensagemAmigavel(msg) };
  }

  return { ok: true, novoId };
}
