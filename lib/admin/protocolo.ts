"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { audit } from "@/lib/admin/audit";
import { mensagemAmigavel, turmaIniciada, pendenciasPublicacao } from "@/lib/admin/protocolo-data";

// ---------------------------------------------------------------------------
// FASE C / C1 — server actions de autoria do protocolo.
// Todas: gateAdmin + auditoria + erros amigáveis (respeitando triggers FASE B).
// Sem SQL novo, sem migrations. Não toca Scoring/Ranking/Check-ins/Encerramento.
// ---------------------------------------------------------------------------

async function gateAdmin() {
  const supabase = await createServerSupabase();
  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (!ehAdmin) redirect("/perfil");
  return supabase;
}

function validaConteudo(tipo: string, corpo: string): string | null {
  if (tipo !== "texto" && tipo !== "link") return "Tipo de conteúdo inválido.";
  if (!corpo.trim()) return "O conteúdo não pode ser vazio.";
  if (tipo === "link") {
    try {
      new URL(corpo.trim());
    } catch {
      return "Link inválido (informe uma URL completa, ex.: https://...).";
    }
  }
  return null;
}

// ============================== FASES ======================================

export async function criarFase(formData: FormData) {
  const sb = await gateAdmin();
  const programaId = String(formData.get("programa_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const back = `/admin/programas/${programaId}/fases`;
  if (!nome) redirect(`${back}?erro=${encodeURIComponent("Informe o nome da fase.")}`);
  const { data: maxRow } = await sb
    .from("programa_fases")
    .select("ordem")
    .eq("programa_id", programaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = ((maxRow as { ordem: number } | null)?.ordem ?? 0) + 1;
  const { data, error } = await sb
    .from("programa_fases")
    .insert({ programa_id: programaId, nome, descricao, ordem })
    .select("id")
    .single();
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("fase_criada", `fase:${(data as { id: string }).id}`, {
    programa_id: programaId,
    nome,
    ordem,
  });
  revalidatePath(back);
  redirect(`${back}?ok=fase_criada`);
}

export async function editarFase(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const back = `/admin/programas/${programaId}/fases`;
  const { error } = await sb.from("programa_fases").update({ nome, descricao }).eq("id", id);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("fase_editada", `fase:${id}`, { programa_id: programaId, nome });
  revalidatePath(back);
  redirect(`${back}?ok=fase_editada`);
}

export async function excluirFase(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const back = `/admin/programas/${programaId}/fases`;
  const { count } = await sb
    .from("protocolo_dias")
    .select("id", { count: "exact", head: true })
    .eq("fase_id", id);
  if ((count ?? 0) > 0)
    redirect(
      `${back}?erro=${encodeURIComponent(`Fase em uso por ${count} dia(s) — reatribua antes de excluir.`)}`,
    );
  const { error } = await sb.from("programa_fases").delete().eq("id", id);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("fase_excluida", `fase:${id}`, { programa_id: programaId });
  revalidatePath(back);
  redirect(`${back}?ok=fase_excluida`);
}

export async function reordenarFases(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const direcao = String(formData.get("direcao") ?? "");
  const back = `/admin/programas/${programaId}/fases`;
  const { data: atualRow } = await sb
    .from("programa_fases")
    .select("id, ordem")
    .eq("id", id)
    .maybeSingle();
  const atual = atualRow as { id: string; ordem: number } | null;
  if (!atual) redirect(`${back}?erro=${encodeURIComponent("Fase não encontrada.")}`);
  const alvo = direcao === "cima" ? atual!.ordem - 1 : atual!.ordem + 1;
  const { data: vizRow } = await sb
    .from("programa_fases")
    .select("id, ordem")
    .eq("programa_id", programaId)
    .eq("ordem", alvo)
    .maybeSingle();
  const viz = vizRow as { id: string; ordem: number } | null;
  if (!viz) redirect(`${back}?ok=sem_mudanca`);
  // troca em dois passos (ordem temporária evita colisão de unique)
  await sb.from("programa_fases").update({ ordem: -1 }).eq("id", atual!.id);
  await sb.from("programa_fases").update({ ordem: atual!.ordem }).eq("id", viz!.id);
  await sb.from("programa_fases").update({ ordem: alvo }).eq("id", atual!.id);
  await audit("fase_reordenada", `fase:${id}`, {
    programa_id: programaId,
    de: atual!.ordem,
    para: alvo,
  });
  revalidatePath(back);
  redirect(`${back}?ok=fase_reordenada`);
}

// =============================== DIAS ======================================

export async function editarDia(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const numero = String(formData.get("numero") ?? "");
  const back = `/admin/programas/${programaId}/dias/${numero}`;
  const patch: Record<string, unknown> = {
    titulo: String(formData.get("titulo") ?? "").trim() || null,
    instrucoes: String(formData.get("instrucoes") ?? "").trim() || null,
    missao_titulo: String(formData.get("missao_titulo") ?? "").trim(),
    missao_descricao: String(formData.get("missao_descricao") ?? "").trim() || null,
    fase_id: String(formData.get("fase_id") ?? "") || null,
    eh_marco: formData.get("eh_marco") === "on",
    marco_titulo: String(formData.get("marco_titulo") ?? "").trim() || null,
    marco_descricao: String(formData.get("marco_descricao") ?? "").trim() || null,
  };
  // pontuação só quando NÃO travado (a UI desabilita; aqui é defesa extra)
  const travado = await turmaIniciada(programaId);
  if (!travado && formData.get("missao_pontos") !== null) {
    patch.missao_pontos = Number(formData.get("missao_pontos"));
  }
  const { error } = await sb.from("protocolo_dias").update(patch).eq("id", id);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("dia_editado", `dia:${id}`, { programa_id: programaId, numero });
  revalidatePath(back);
  redirect(`${back}?ok=dia_editado`);
}

// ============================= CONTEÚDOS ===================================

export async function criarConteudo(formData: FormData) {
  const sb = await gateAdmin();
  const diaId = String(formData.get("dia_id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const numero = String(formData.get("numero") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim() || null;
  const corpo = String(formData.get("corpo") ?? "");
  const back = `/admin/programas/${programaId}/dias/${numero}`;
  const err = validaConteudo(tipo, corpo);
  if (err) redirect(`${back}?erro=${encodeURIComponent(err)}`);
  const { data: maxRow } = await sb
    .from("protocolo_conteudos")
    .select("ordem")
    .eq("dia_id", diaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = ((maxRow as { ordem: number } | null)?.ordem ?? 0) + 1;
  const { data, error } = await sb
    .from("protocolo_conteudos")
    .insert({ dia_id: diaId, tipo, titulo, corpo: corpo.trim(), ordem })
    .select("id")
    .single();
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("conteudo_criado", `conteudo:${(data as { id: string }).id}`, {
    dia_id: diaId,
    tipo,
  });
  revalidatePath(back);
  redirect(`${back}?ok=conteudo_criado`);
}

export async function editarConteudo(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const numero = String(formData.get("numero") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim() || null;
  const corpo = String(formData.get("corpo") ?? "");
  const back = `/admin/programas/${programaId}/dias/${numero}`;
  const err = validaConteudo(tipo, corpo);
  if (err) redirect(`${back}?erro=${encodeURIComponent(err)}`);
  const { error } = await sb
    .from("protocolo_conteudos")
    .update({ tipo, titulo, corpo: corpo.trim() })
    .eq("id", id);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("conteudo_editado", `conteudo:${id}`, { programa_id: programaId, tipo });
  revalidatePath(back);
  redirect(`${back}?ok=conteudo_editado`);
}

export async function excluirConteudo(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const numero = String(formData.get("numero") ?? "");
  const back = `/admin/programas/${programaId}/dias/${numero}`;
  const { error } = await sb.from("protocolo_conteudos").delete().eq("id", id);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("conteudo_excluido", `conteudo:${id}`, { programa_id: programaId });
  revalidatePath(back);
  redirect(`${back}?ok=conteudo_excluido`);
}

export async function reordenarConteudos(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const diaId = String(formData.get("dia_id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const numero = String(formData.get("numero") ?? "");
  const direcao = String(formData.get("direcao") ?? "");
  const back = `/admin/programas/${programaId}/dias/${numero}`;
  const { data: atualRow } = await sb
    .from("protocolo_conteudos")
    .select("id, ordem")
    .eq("id", id)
    .maybeSingle();
  const atual = atualRow as { id: string; ordem: number } | null;
  if (!atual) redirect(`${back}?erro=${encodeURIComponent("Conteúdo não encontrado.")}`);
  const alvo = direcao === "cima" ? atual!.ordem - 1 : atual!.ordem + 1;
  const { data: vizRow } = await sb
    .from("protocolo_conteudos")
    .select("id, ordem")
    .eq("dia_id", diaId)
    .eq("ordem", alvo)
    .maybeSingle();
  const viz = vizRow as { id: string; ordem: number } | null;
  if (!viz) redirect(`${back}?ok=sem_mudanca`);
  await sb.from("protocolo_conteudos").update({ ordem: -1 }).eq("id", atual!.id);
  await sb.from("protocolo_conteudos").update({ ordem: atual!.ordem }).eq("id", viz!.id);
  await sb.from("protocolo_conteudos").update({ ordem: alvo }).eq("id", atual!.id);
  await audit("conteudo_reordenado", `conteudo:${id}`, {
    programa_id: programaId,
    de: atual!.ordem,
    para: alvo,
  });
  revalidatePath(back);
  redirect(`${back}?ok=conteudo_reordenado`);
}

// ============================ PUBLICAÇÃO ===================================

export async function publicarPrograma(formData: FormData) {
  const sb = await gateAdmin();
  const programaId = String(formData.get("programa_id") ?? "");
  const back = `/admin/programas/${programaId}/publicacao`;
  const pend = await pendenciasPublicacao(programaId);
  if (pend.length > 0)
    redirect(`${back}?erro=${encodeURIComponent("Não foi possível publicar: " + pend.join("; "))}`);
  const { error } = await sb.from("programas").update({ is_publicado: true }).eq("id", programaId);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("programa_publicado", `programa:${programaId}`, {});
  revalidatePath(back);
  redirect(`${back}?ok=publicado`);
}

export async function despublicarPrograma(formData: FormData) {
  const sb = await gateAdmin();
  const programaId = String(formData.get("programa_id") ?? "");
  const back = `/admin/programas/${programaId}/publicacao`;
  if (await turmaIniciada(programaId))
    redirect(
      `${back}?erro=${encodeURIComponent("Programa com histórico de execução não pode ser despublicado.")}`,
    );
  const { error } = await sb.from("programas").update({ is_publicado: false }).eq("id", programaId);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("programa_despublicado", `programa:${programaId}`, {});
  revalidatePath(back);
  redirect(`${back}?ok=despublicado`);
}

// ============================= CLONAGEM ====================================

export async function clonarPrograma(formData: FormData) {
  const sb = await gateAdmin();
  const origemId = String(formData.get("origem_id") ?? "");
  const novoNome = String(formData.get("nome") ?? "").trim();
  const back = `/admin/programas/${origemId}/clonar`;

  const { data: origemRow } = await sb
    .from("programas")
    .select("id, temporada_id, descricao, duracao_dias, is_publicado")
    .eq("id", origemId)
    .maybeSingle();
  const origem = origemRow as {
    id: string;
    temporada_id: string;
    descricao: string | null;
    duracao_dias: number;
    is_publicado: boolean;
  } | null;
  if (!origem) redirect(`${back}?erro=${encodeURIComponent("Programa de origem não encontrado.")}`);
  if (!origem!.is_publicado)
    redirect(`${back}?erro=${encodeURIComponent("Só programas publicados podem ser clonados.")}`);
  if (!novoNome)
    redirect(`${back}?erro=${encodeURIComponent("Informe um nome para o novo programa.")}`);

  // 1) novo programa (rascunho, sem turma → locks inativos)
  const { data: novoRow, error: e0 } = await sb
    .from("programas")
    .insert({
      temporada_id: origem!.temporada_id,
      nome: novoNome,
      descricao: origem!.descricao,
      duracao_dias: origem!.duracao_dias,
      is_publicado: false,
    })
    .select("id")
    .single();
  if (e0) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(e0.message))}`);
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
    redirect(`${back}?erro=${encodeURIComponent("Falha ao clonar: " + mensagemAmigavel(msg))}`);
  }

  await audit("programa_clonado", `programa:${novoId}`, { origem: origemId, nome: novoNome });
  revalidatePath("/admin/programas");
  redirect(`/admin/programas/${novoId}?ok=clonado`);
}
