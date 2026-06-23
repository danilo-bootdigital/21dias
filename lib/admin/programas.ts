"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { audit } from "@/lib/admin/audit";
import { mensagemAmigavel, pendenciasPublicacao, turmaIniciada } from "@/lib/admin/protocolo-data";
import { clonarProgramaCompleto } from "@/lib/admin/clonar-core";

// ---------------------------------------------------------------------------
// Gestão administrativa de Programas (CRUD + duplicar + arquivar + publicar).
// Todas as ações: gateAdmin + auditoria + erros amigáveis, respeitando os locks
// e gates homologados (triggers 0010, programa_pendencias_publicacao). Não toca
// fases/dias/conteúdos/turmas/matrículas — só a linha de `programas`.
// ---------------------------------------------------------------------------

type SupabaseServer = Awaited<ReturnType<typeof createServerSupabase>>;

async function gateAdmin() {
  const supabase = await createServerSupabase();
  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (!ehAdmin) redirect("/perfil");
  return supabase;
}

/** Nome duplicado (case-insensitive) na mesma temporada, ignorando arquivados e o próprio id. */
async function nomeDuplicado(
  sb: SupabaseServer,
  temporadaId: string,
  nome: string,
  excetoId?: string,
): Promise<boolean> {
  let q = sb
    .from("programas")
    .select("id")
    .eq("temporada_id", temporadaId)
    .is("arquivado_at", null)
    .ilike("nome", nome);
  if (excetoId) q = q.neq("id", excetoId);
  const { data } = await q.limit(1).maybeSingle();
  return Boolean(data);
}

/** Valida os campos comuns de criação/edição. Retorna mensagem de erro ou null. */
function validarCampos(nome: string, temporadaId: string, duracao: number): string | null {
  if (!nome) return "Informe o nome do programa.";
  if (!temporadaId) return "Selecione a temporada.";
  if (!Number.isFinite(duracao) || duracao < 1) return "A duração deve ser maior que zero.";
  if (duracao > 400) return "A duração não pode passar de 400 dias.";
  return null;
}

// =============================== CRIAR =====================================

export async function criarPrograma(formData: FormData) {
  const sb = await gateAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const temporadaId = String(formData.get("temporada_id") ?? "");
  const duracao = Number(formData.get("duracao_dias"));
  const publicar = String(formData.get("status") ?? "rascunho") === "publicado";
  const back = "/admin/programas/novo";

  const erro = validarCampos(nome, temporadaId, duracao);
  if (erro) redirect(`${back}?erro=${encodeURIComponent(erro)}`);
  if (await nomeDuplicado(sb, temporadaId, nome))
    redirect(`${back}?erro=${encodeURIComponent("Já existe um programa com esse nome nesta temporada.")}`);

  // Nasce como rascunho (publicação passa pelo gate de pendências, abaixo).
  const { data: row, error } = await sb
    .from("programas")
    .insert({
      temporada_id: temporadaId,
      nome,
      descricao,
      duracao_dias: duracao,
      is_publicado: false,
    })
    .select("id")
    .single();
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  const id = (row as { id: string }).id;
  await audit("programa_criado", `programa:${id}`, { nome, temporada_id: temporadaId });

  // Publicação opcional respeitando exatamente o gate homologado.
  if (publicar) {
    const pend = await pendenciasPublicacao(id);
    if (pend.length > 0) {
      revalidatePath("/admin/programas");
      redirect(
        `/admin/programas/${id}?erro=${encodeURIComponent(
          "Programa criado como rascunho. Não foi possível publicar: " + pend.join("; "),
        )}`,
      );
    }
    const { error: ePub } = await sb.from("programas").update({ is_publicado: true }).eq("id", id);
    if (ePub)
      redirect(`/admin/programas/${id}?erro=${encodeURIComponent(mensagemAmigavel(ePub.message))}`);
    await audit("programa_publicado", `programa:${id}`, {});
  }

  revalidatePath("/admin/programas");
  redirect(`/admin/programas/${id}?ok=${encodeURIComponent("Programa criado.")}`);
}

// =============================== EDITAR ====================================

export async function editarPrograma(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const temporadaId = String(formData.get("temporada_id") ?? "");
  const duracao = Number(formData.get("duracao_dias"));
  const querPublicado = String(formData.get("status") ?? "rascunho") === "publicado";
  const back = `/admin/programas/${id}/editar`;

  const { data: atualRow } = await sb
    .from("programas")
    .select("id, is_publicado, arquivado_at")
    .eq("id", id)
    .maybeSingle();
  const atual = atualRow as { id: string; is_publicado: boolean; arquivado_at: string | null } | null;
  if (!atual) redirect(`${back}?erro=${encodeURIComponent("Programa não encontrado.")}`);

  const erro = validarCampos(nome, temporadaId, duracao);
  if (erro) redirect(`${back}?erro=${encodeURIComponent(erro)}`);
  if (await nomeDuplicado(sb, temporadaId, nome, id))
    redirect(`${back}?erro=${encodeURIComponent("Já existe um programa com esse nome nesta temporada.")}`);

  // 1) Dados básicos — preserva fases/dias/conteúdos (não os tocamos).
  const { error } = await sb
    .from("programas")
    .update({ nome, descricao, temporada_id: temporadaId, duracao_dias: duracao })
    .eq("id", id);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("programa_editado", `programa:${id}`, { nome, temporada_id: temporadaId, duracao });

  // 2) Transição de publicação via status (só fora de arquivado; gates homologados).
  if (!atual!.arquivado_at && querPublicado !== atual!.is_publicado) {
    if (querPublicado) {
      const pend = await pendenciasPublicacao(id);
      if (pend.length > 0)
        redirect(
          `${back}?erro=${encodeURIComponent("Dados salvos. Não foi possível publicar: " + pend.join("; "))}`,
        );
      const { error: ePub } = await sb.from("programas").update({ is_publicado: true }).eq("id", id);
      if (ePub) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(ePub.message))}`);
      await audit("programa_publicado", `programa:${id}`, {});
    } else {
      if (await turmaIniciada(id))
        redirect(
          `${back}?erro=${encodeURIComponent("Dados salvos. Programa com histórico de execução não pode ser despublicado.")}`,
        );
      const { error: eUnp } = await sb
        .from("programas")
        .update({ is_publicado: false })
        .eq("id", id);
      if (eUnp) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(eUnp.message))}`);
      await audit("programa_despublicado", `programa:${id}`, {});
    }
  }

  revalidatePath("/admin/programas");
  revalidatePath(`/admin/programas/${id}`);
  redirect(`/admin/programas/${id}?ok=${encodeURIComponent("Programa atualizado.")}`);
}

// ============================== DUPLICAR ===================================

export async function duplicarPrograma(formData: FormData) {
  const sb = await gateAdmin();
  const origemId = String(formData.get("id") ?? "");
  const back = "/admin/programas";

  const { data: origemRow } = await sb
    .from("programas")
    .select("id, nome, temporada_id")
    .eq("id", origemId)
    .maybeSingle();
  const origem = origemRow as { id: string; nome: string; temporada_id: string } | null;
  if (!origem) redirect(`${back}?erro=${encodeURIComponent("Programa de origem não encontrado.")}`);

  // Nome único: "<nome> (Cópia)", "<nome> (Cópia 2)", ...
  let novoNome = `${origem!.nome} (Cópia)`;
  for (let n = 2; await nomeDuplicado(sb, origem!.temporada_id, novoNome); n++) {
    novoNome = `${origem!.nome} (Cópia ${n})`;
  }

  const res = await clonarProgramaCompleto(sb, origemId, novoNome);
  if (!res.ok) redirect(`${back}?erro=${encodeURIComponent("Falha ao duplicar: " + res.erro)}`);

  await audit("programa_duplicado", `programa:${res.novoId}`, { origem: origemId, nome: novoNome });
  revalidatePath("/admin/programas");
  redirect(`/admin/programas/${res.novoId}?ok=${encodeURIComponent("Programa duplicado como rascunho.")}`);
}

// ======================== ARQUIVAR / RESTAURAR =============================

export async function arquivarPrograma(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const { error } = await sb
    .from("programas")
    .update({ arquivado_at: new Date().toISOString() })
    .eq("id", id)
    .is("arquivado_at", null);
  if (error) redirect(`/admin/programas?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("programa_arquivado", `programa:${id}`, {});
  revalidatePath("/admin/programas");
  redirect(`/admin/programas?ok=${encodeURIComponent("Programa arquivado.")}`);
}

export async function desarquivarPrograma(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const { error } = await sb.from("programas").update({ arquivado_at: null }).eq("id", id);
  if (error) redirect(`/admin/programas?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("programa_desarquivado", `programa:${id}`, {});
  revalidatePath("/admin/programas");
  redirect(`/admin/programas?ok=${encodeURIComponent("Programa restaurado.")}`);
}

// =============================== EXCLUIR ===================================

export async function excluirPrograma(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const back = "/admin/programas";

  // Bloqueia exclusão se houver vínculo operacional (turmas ou entitlements).
  // Matrículas dependem de turma, logo já são cobertas pela checagem de turmas.
  const [{ count: turmas }, { count: ents }] = await Promise.all([
    sb.from("turmas").select("id", { count: "exact", head: true }).eq("programa_id", id),
    sb.from("entitlements").select("id", { count: "exact", head: true }).eq("programa_id", id),
  ]);
  if ((turmas ?? 0) > 0 || (ents ?? 0) > 0)
    redirect(
      `${back}?erro=${encodeURIComponent(
        "Este programa possui vínculos (turmas, matrículas ou acessos) e não pode ser excluído. Arquive-o em vez de excluir.",
      )}`,
    );

  const { error } = await sb.from("programas").delete().eq("id", id);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("programa_excluido", `programa:${id}`, {});
  revalidatePath("/admin/programas");
  redirect(`${back}?ok=${encodeURIComponent("Programa excluído.")}`);
}

// ===================== PUBLICAR / DESPUBLICAR (lista) ======================

export async function publicarProgramaLista(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const back = "/admin/programas";
  const pend = await pendenciasPublicacao(id);
  if (pend.length > 0)
    redirect(`${back}?erro=${encodeURIComponent("Não foi possível publicar: " + pend.join("; "))}`);
  const { error } = await sb.from("programas").update({ is_publicado: true }).eq("id", id);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("programa_publicado", `programa:${id}`, {});
  revalidatePath(back);
  redirect(`${back}?ok=${encodeURIComponent("Programa publicado.")}`);
}

export async function despublicarProgramaLista(formData: FormData) {
  const sb = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const back = "/admin/programas";
  if (await turmaIniciada(id))
    redirect(
      `${back}?erro=${encodeURIComponent("Programa com histórico de execução não pode ser despublicado.")}`,
    );
  const { error } = await sb.from("programas").update({ is_publicado: false }).eq("id", id);
  if (error) redirect(`${back}?erro=${encodeURIComponent(mensagemAmigavel(error.message))}`);
  await audit("programa_despublicado", `programa:${id}`, {});
  revalidatePath(back);
  redirect(`${back}?ok=${encodeURIComponent("Programa despublicado.")}`);
}
