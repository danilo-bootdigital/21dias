"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { audit } from "@/lib/admin/audit";
import { mensagemAmigavel, turmaIniciada, pendenciasPublicacao } from "@/lib/admin/protocolo-data";
import { clonarProgramaCompleto } from "@/lib/admin/clonar-core";

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
  const { error } = await sb
    .from("programa_fases")
    .update({ nome, descricao })
    .eq("id", id)
    .eq("programa_id", programaId);
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

  // fase_id deve pertencer ao MESMO programa (FK só garante existência)
  const faseId = String(formData.get("fase_id") ?? "") || null;
  if (faseId) {
    const { data: faseOk } = await sb
      .from("programa_fases")
      .select("id")
      .eq("id", faseId)
      .eq("programa_id", programaId)
      .maybeSingle();
    if (!faseOk)
      redirect(`${back}?erro=${encodeURIComponent("Fase inválida para este programa.")}`);
  }

  const patch: Record<string, unknown> = {
    titulo: String(formData.get("titulo") ?? "").trim() || null,
    instrucoes: String(formData.get("instrucoes") ?? "").trim() || null,
    missao_titulo: String(formData.get("missao_titulo") ?? "").trim(),
    missao_descricao: String(formData.get("missao_descricao") ?? "").trim() || null,
    fase_id: faseId,
    eh_marco: formData.get("eh_marco") === "on",
    marco_titulo: String(formData.get("marco_titulo") ?? "").trim() || null,
    marco_descricao: String(formData.get("marco_descricao") ?? "").trim() || null,
  };
  // pontuação só quando NÃO travado (a UI desabilita; aqui é defesa extra)
  const travado = await turmaIniciada(programaId);
  if (!travado && formData.get("missao_pontos") !== null) {
    patch.missao_pontos = Number(formData.get("missao_pontos"));
  }
  const { error } = await sb
    .from("protocolo_dias")
    .update(patch)
    .eq("id", id)
    .eq("programa_id", programaId);
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

// ===================== PROTOCOLO (cadastro — FASE D) =======================
// "Protocolo" = o conteúdo de um dia (protocolo_dias). As ações abaixo
// respeitam os locks 0010 (insert/delete só antes da turma iniciar; pontuação
// travada após início). Checklist e campos de imagem são novos e não pontuam.

function editorBack(programaId: string, protocoloId: string) {
  return `/admin/programas/${programaId}/protocolos/${protocoloId}/editar`;
}

async function validarFaseDoPrograma(
  sb: Awaited<ReturnType<typeof createServerSupabase>>,
  programaId: string,
  faseId: string,
): Promise<boolean> {
  const { data } = await sb
    .from("programa_fases")
    .select("id")
    .eq("id", faseId)
    .eq("programa_id", programaId)
    .maybeSingle();
  return Boolean(data);
}

export async function criarProtocolo(formData: FormData) {
  const sb = await gateAdmin();
  const programaId = String(formData.get("programa_id") ?? "");
  const back = `/admin/programas/${programaId}/protocolos/novo`;

  const numero = Number(formData.get("numero"));
  if (!Number.isFinite(numero) || numero < 1)
    redirect(`${back}?erro=${encodeURIComponent("Informe um número de dia válido (≥ 1).")}`);

  const faseId = String(formData.get("fase_id") ?? "");
  if (!faseId || !(await validarFaseDoPrograma(sb, programaId, faseId)))
    redirect(`${back}?erro=${encodeURIComponent("Selecione uma fase válida para este programa.")}`);

  const missaoTitulo = String(formData.get("missao_titulo") ?? "").trim();
  if (!missaoTitulo)
    redirect(`${back}?erro=${encodeURIComponent("O título da missão é obrigatório.")}`);

  const pontosRaw = Number(formData.get("missao_pontos"));
  const missaoPontos = Number.isFinite(pontosRaw) && pontosRaw >= 0 ? pontosRaw : 40;

  const { data, error } = await sb
    .from("protocolo_dias")
    .insert({
      programa_id: programaId,
      numero,
      fase_id: faseId,
      titulo: String(formData.get("titulo") ?? "").trim() || null,
      protocolo_descricao: String(formData.get("protocolo_descricao") ?? "").trim() || null,
      instrucoes: String(formData.get("instrucoes") ?? "").trim() || null,
      missao_titulo: missaoTitulo,
      missao_descricao: String(formData.get("missao_descricao") ?? "").trim() || null,
      missao_pontos: missaoPontos,
      protocolo_ativo: formData.get("protocolo_ativo") === "on",
    })
    .select("id")
    .single();
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  const id = (data as { id: string }).id;
  await audit("protocolo_criado", `dia:${id}`, { programa_id: programaId, numero });
  revalidatePath(`/admin/programas/${programaId}/dias`);
  redirect(`${editorBack(programaId, id)}?ok=protocolo_criado`);
}

export async function editarProtocolo(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const back = editorBack(programaId, id);

  const faseId = String(formData.get("fase_id") ?? "") || null;
  if (faseId && !(await validarFaseDoPrograma(sb, programaId, faseId)))
    redirect(`${back}?erro=${encodeURIComponent("Fase inválida para este programa.")}`);

  const patch: Record<string, unknown> = {
    titulo: String(formData.get("titulo") ?? "").trim() || null,
    protocolo_descricao: String(formData.get("protocolo_descricao") ?? "").trim() || null,
    instrucoes: String(formData.get("instrucoes") ?? "").trim() || null,
    missao_titulo: String(formData.get("missao_titulo") ?? "").trim(),
    missao_descricao: String(formData.get("missao_descricao") ?? "").trim() || null,
    fase_id: faseId,
    protocolo_ativo: formData.get("protocolo_ativo") === "on",
    eh_marco: formData.get("eh_marco") === "on",
    marco_titulo: String(formData.get("marco_titulo") ?? "").trim() || null,
    marco_descricao: String(formData.get("marco_descricao") ?? "").trim() || null,
  };
  const travado = await turmaIniciada(programaId);
  if (!travado && formData.get("missao_pontos") !== null) {
    patch.missao_pontos = Number(formData.get("missao_pontos"));
  }
  const { error } = await sb
    .from("protocolo_dias")
    .update(patch)
    .eq("id", id)
    .eq("programa_id", programaId);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("protocolo_editado", `dia:${id}`, { programa_id: programaId });
  revalidatePath(back);
  redirect(`${back}?ok=protocolo_editado`);
}

export async function excluirProtocolo(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const back = `/admin/programas/${programaId}/dias`;
  const { error } = await sb
    .from("protocolo_dias")
    .delete()
    .eq("id", id)
    .eq("programa_id", programaId);
  if (error)
    redirect(
      `${editorBack(programaId, id)}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`,
    );
  await audit("protocolo_excluido", `dia:${id}`, { programa_id: programaId });
  revalidatePath(back);
  redirect(`${back}?ok=protocolo_excluido`);
}

// ----------------------------- CHECK-IN DO DIA -----------------------------

export async function criarCheckinItem(formData: FormData) {
  const sb = await gateAdmin();
  const programaId = String(formData.get("programa_id") ?? "");
  const protocoloId = String(formData.get("protocolo_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  const back = editorBack(programaId, protocoloId);
  if (!texto) redirect(`${back}?erro=${encodeURIComponent("Informe o texto da tarefa.")}`);
  const { data: maxRow } = await sb
    .from("protocolo_checkin_itens")
    .select("ordem")
    .eq("dia_id", protocoloId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = ((maxRow as { ordem: number } | null)?.ordem ?? 0) + 1;
  const { error } = await sb
    .from("protocolo_checkin_itens")
    .insert({ dia_id: protocoloId, texto, ordem });
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("checkin_item_criado", `dia:${protocoloId}`, { programa_id: programaId });
  revalidatePath(back);
  redirect(`${back}?ok=item_criado`);
}

export async function editarCheckinItem(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const protocoloId = String(formData.get("protocolo_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  const back = editorBack(programaId, protocoloId);
  if (!texto) redirect(`${back}?erro=${encodeURIComponent("Informe o texto da tarefa.")}`);
  const { error } = await sb.from("protocolo_checkin_itens").update({ texto }).eq("id", id);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  revalidatePath(back);
  redirect(`${back}?ok=item_editado`);
}

export async function excluirCheckinItem(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const protocoloId = String(formData.get("protocolo_id") ?? "");
  const back = editorBack(programaId, protocoloId);
  const { error } = await sb.from("protocolo_checkin_itens").delete().eq("id", id);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  revalidatePath(back);
  redirect(`${back}?ok=item_excluido`);
}

export async function reordenarCheckinItens(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const programaId = String(formData.get("programa_id") ?? "");
  const protocoloId = String(formData.get("protocolo_id") ?? "");
  const direcao = String(formData.get("direcao") ?? "");
  const back = editorBack(programaId, protocoloId);
  const { data: atualRow } = await sb
    .from("protocolo_checkin_itens")
    .select("id, ordem")
    .eq("id", id)
    .maybeSingle();
  const atual = atualRow as { id: string; ordem: number } | null;
  if (!atual) redirect(`${back}?erro=${encodeURIComponent("Item não encontrado.")}`);
  const alvo = direcao === "cima" ? atual!.ordem - 1 : atual!.ordem + 1;
  const { data: vizRow } = await sb
    .from("protocolo_checkin_itens")
    .select("id, ordem")
    .eq("dia_id", protocoloId)
    .eq("ordem", alvo)
    .maybeSingle();
  const viz = vizRow as { id: string; ordem: number } | null;
  if (!viz) redirect(`${back}?ok=sem_mudanca`);
  await sb.from("protocolo_checkin_itens").update({ ordem: -1 }).eq("id", atual!.id);
  await sb.from("protocolo_checkin_itens").update({ ordem: atual!.ordem }).eq("id", viz!.id);
  await sb.from("protocolo_checkin_itens").update({ ordem: alvo }).eq("id", atual!.id);
  revalidatePath(back);
  redirect(`${back}?ok=item_reordenado`);
}

// ----------------------------- CAMPOS DE IMAGEM ----------------------------

export async function salvarCampoImagem(formData: FormData) {
  const sb = await gateAdmin();
  const programaId = String(formData.get("programa_id") ?? "");
  const protocoloId = String(formData.get("protocolo_id") ?? "");
  const slot = Number(formData.get("slot"));
  const back = editorBack(programaId, protocoloId);
  if (![1, 2, 3].includes(slot))
    redirect(`${back}?erro=${encodeURIComponent("Campo de imagem inválido.")}`);
  const { error } = await sb.from("protocolo_imagem_campos").upsert(
    {
      dia_id: protocoloId,
      slot,
      ativo: formData.get("ativo") === "on",
      titulo: String(formData.get("titulo") ?? "").trim() || null,
      instrucao: String(formData.get("instrucao") ?? "").trim() || null,
      obrigatorio: formData.get("obrigatorio") === "on",
    },
    { onConflict: "dia_id,slot" },
  );
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  revalidatePath(back);
  redirect(`${back}?ok=campo_salvo`);
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
    .select("id, is_publicado")
    .eq("id", origemId)
    .maybeSingle();
  const origem = origemRow as { id: string; is_publicado: boolean } | null;
  if (!origem) redirect(`${back}?erro=${encodeURIComponent("Programa de origem não encontrado.")}`);
  if (!origem!.is_publicado)
    redirect(`${back}?erro=${encodeURIComponent("Só programas publicados podem ser clonados.")}`);
  if (!novoNome)
    redirect(`${back}?erro=${encodeURIComponent("Informe um nome para o novo programa.")}`);

  const res = await clonarProgramaCompleto(sb, origemId, novoNome);
  if (!res.ok) redirect(`${back}?erro=${encodeURIComponent("Falha ao clonar: " + res.erro)}`);

  await audit("programa_clonado", `programa:${res.novoId}`, { origem: origemId, nome: novoNome });
  revalidatePath("/admin/programas");
  redirect(`/admin/programas/${res.novoId}?ok=clonado`);
}
