import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// FASE C — helpers de LEITURA do protocolo (usados pelas páginas admin em C2)
// e mensagemAmigavel (mapeia erros conhecidos dos triggers/locks da FASE B).
// Função pura + leituras ficam fora do arquivo "use server" (que só pode
// exportar server actions async).
// ---------------------------------------------------------------------------

export type Fase = { id: string; ordem: number; nome: string; descricao: string | null };
export type DiaResumo = {
  id: string;
  numero: number;
  fase_nome: string | null;
  missao_titulo: string;
  eh_marco: boolean;
  ativo: boolean;
  conteudos: number;
};
export type Conteudo = {
  id: string;
  ordem: number;
  tipo: string;
  titulo: string | null;
  corpo: string;
};
export type Protocolo = {
  id: string;
  numero: number;
  fase_id: string;
  missao_titulo: string;
  missao_descricao: string | null;
  missao_pontos: number;
  titulo: string | null;
  instrucoes: string | null;
  protocolo_descricao: string | null;
  protocolo_ativo: boolean;
  eh_marco: boolean;
  marco_titulo: string | null;
  marco_descricao: string | null;
};
export type CheckinItem = { id: string; ordem: number; texto: string };
export type CampoImagem = {
  slot: number;
  ativo: boolean;
  titulo: string | null;
  instrucao: string | null;
  obrigatorio: boolean;
};

export async function obterPrograma(id: string) {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("programas")
    .select("id, nome, descricao, duracao_dias, is_publicado, temporada_id")
    .eq("id", id)
    .maybeSingle();
  return data as {
    id: string;
    nome: string;
    descricao: string | null;
    duracao_dias: number;
    is_publicado: boolean;
    temporada_id: string;
  } | null;
}

export async function listarFases(programaId: string): Promise<Fase[]> {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("programa_fases")
    .select("id, ordem, nome, descricao")
    .eq("programa_id", programaId)
    .order("ordem");
  return (data ?? []) as Fase[];
}

export async function listarDias(programaId: string): Promise<DiaResumo[]> {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("protocolo_dias")
    .select(
      "id, numero, missao_titulo, eh_marco, protocolo_ativo, programa_fases(nome), protocolo_conteudos(count)",
    )
    .eq("programa_id", programaId)
    .order("numero");
  const rows = (data ?? []) as unknown as {
    id: string;
    numero: number;
    missao_titulo: string;
    eh_marco: boolean;
    protocolo_ativo: boolean;
    programa_fases: { nome: string } | null;
    protocolo_conteudos: { count: number }[];
  }[];
  return rows.map((r) => ({
    id: r.id,
    numero: r.numero,
    fase_nome: r.programa_fases?.nome ?? null,
    missao_titulo: r.missao_titulo,
    eh_marco: r.eh_marco,
    ativo: r.protocolo_ativo,
    conteudos: r.protocolo_conteudos?.[0]?.count ?? 0,
  }));
}

/** Protocolo (dia) por id, garantindo que pertence ao programa. */
export async function obterProtocoloPorId(
  programaId: string,
  protocoloId: string,
): Promise<Protocolo | null> {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("protocolo_dias")
    .select(
      "id, numero, fase_id, missao_titulo, missao_descricao, missao_pontos, titulo, instrucoes, protocolo_descricao, protocolo_ativo, eh_marco, marco_titulo, marco_descricao",
    )
    .eq("id", protocoloId)
    .eq("programa_id", programaId)
    .maybeSingle();
  return data as Protocolo | null;
}

/** Próximo número de dia disponível para o programa (para o cadastro novo). */
export async function proximoNumeroDia(programaId: string): Promise<number> {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("protocolo_dias")
    .select("numero")
    .eq("programa_id", programaId)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as { numero: number } | null)?.numero ?? 0) + 1;
}

export async function listarCheckinItens(diaId: string): Promise<CheckinItem[]> {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("protocolo_checkin_itens")
    .select("id, ordem, texto")
    .eq("dia_id", diaId)
    .order("ordem");
  return (data ?? []) as CheckinItem[];
}

/** Sempre devolve os 3 slots (preenchendo defaults para os ausentes). */
export async function listarCamposImagem(diaId: string): Promise<CampoImagem[]> {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("protocolo_imagem_campos")
    .select("slot, ativo, titulo, instrucao, obrigatorio")
    .eq("dia_id", diaId);
  const rows = (data ?? []) as CampoImagem[];
  return [1, 2, 3].map(
    (slot) =>
      rows.find((r) => r.slot === slot) ?? {
        slot,
        ativo: false,
        titulo: null,
        instrucao: null,
        obrigatorio: false,
      },
  );
}

export async function obterDia(programaId: string, numero: number) {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("protocolo_dias")
    .select(
      "id, numero, fase_id, missao_titulo, missao_descricao, missao_pontos, titulo, instrucoes, eh_marco, marco_titulo, marco_descricao, programa_fases(nome)",
    )
    .eq("programa_id", programaId)
    .eq("numero", numero)
    .maybeSingle();
  return data as unknown as {
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
    programa_fases: { nome: string } | null;
  } | null;
}

export async function listarConteudos(diaId: string): Promise<Conteudo[]> {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("protocolo_conteudos")
    .select("id, ordem, tipo, titulo, corpo")
    .eq("dia_id", diaId)
    .order("ordem");
  return (data ?? []) as Conteudo[];
}

export async function pendenciasPublicacao(programaId: string): Promise<string[]> {
  const sb = await createServerSupabase();
  const { data } = await sb.rpc("programa_pendencias_publicacao", { p_programa: programaId });
  return (data ?? []) as string[];
}

export async function turmaIniciada(programaId: string): Promise<boolean> {
  const sb = await createServerSupabase();
  const { data } = await sb.rpc("programa_tem_turma_iniciada", { p_programa: programaId });
  return Boolean(data);
}

export async function coberturaConteudo(programaId: string) {
  const dias = await listarDias(programaId);
  const total = dias.length;
  const comConteudo = dias.filter((d) => d.conteudos > 0).length;
  return { total, comConteudo, semConteudo: total - comConteudo, dias };
}

/** Converte erros conhecidos (triggers/locks/gates da FASE B + unique) em texto amigável. */
export function mensagemAmigavel(msg: string | null | undefined): string {
  const m = (msg ?? "").toString();
  if (m.includes("Lock: missao_pontos"))
    return "Pontuação da missão travada: a turma já foi iniciada.";
  if (m.includes("Lock: numero")) return "Numeração dos dias travada: a turma já foi iniciada.";
  if (m.includes("Lock: duracao_dias"))
    return "Duração do programa travada: a turma já foi iniciada.";
  if (m.includes("Lock: pontos do habito"))
    return "Pontos dos hábitos travados: a turma já foi iniciada.";
  if (m.includes("nao adicionar dias"))
    return "Não é possível adicionar dias após a turma iniciar.";
  if (m.includes("nao remover dias")) return "Não é possível remover dias após a turma iniciar.";
  if (m.includes("nao adicionar habitos"))
    return "Não é possível adicionar hábitos após a turma iniciar.";
  if (m.includes("nao remover habitos"))
    return "Não é possível remover hábitos após a turma iniciar.";
  if (m.includes("Publicacao bloqueada"))
    return "Não foi possível publicar: " + m.replace(/^[\s\S]*Publicacao bloqueada:\s*/, "");
  if (m.includes("nao pode ser despublicado"))
    return "Programa com histórico de execução não pode ser despublicado.";
  if (m.includes("nao pode ficar sem conteudo"))
    return "Não é possível remover o único conteúdo de um dia publicado.";
  if (m.includes("programa_fases_programa_id_ordem_key"))
    return "Já existe uma fase com essa ordem.";
  if (m.includes("protocolo_conteudos_dia_id_ordem_key"))
    return "Já existe um conteúdo com essa ordem neste dia.";
  if (m.includes("protocolo_dias_programa_id_numero_key"))
    return "Já existe um dia com esse número.";
  if (m.includes("protocolo_dias_missao_pontos_check"))
    return "Pontuação inválida: a missão deve ter pontos maiores ou iguais a zero.";
  return m || "Ocorreu um erro inesperado.";
}
