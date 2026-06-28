"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { matriculaAtivaDoUsuario } from "@/lib/feed/data";

// ---------------------------------------------------------------------------
// Server actions do Feed. Toda autorização real fica na RLS (migration 0002):
//  - posts_insert / curtidas_insert / comentarios_insert exigem
//    owns_matricula() + is_member_turma();
//  - posts_delete e comentarios_delete aceitam dono OU staff (is_staff_turma);
//  - posts_moderate (update de status) exige is_staff_turma().
// Aqui só validamos a entrada e identificamos a matrícula ativa do usuário.
// ---------------------------------------------------------------------------

const MAX_POST = 2000;
const MAX_COMENTARIO = 1000;

const erroRedir = (msg: string): never =>
  redirect(`/feed?erro=${encodeURIComponent(msg)}`);

function ok(msg?: string): never {
  redirect(msg ? `/feed?ok=${encodeURIComponent(msg)}` : "/feed");
}

async function contexto() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ativa = await matriculaAtivaDoUsuario(supabase);
  return { supabase, ativa };
}

/** Cria um post de TEXTO na turma da matrícula ativa. */
export async function criarPost(formData: FormData) {
  const { supabase, ativa } = await contexto();
  if (!ativa) return erroRedir("Você precisa de uma turma ativa para publicar.");
  const conteudo = String(formData.get("conteudo") ?? "").trim();
  if (!conteudo) erroRedir("Escreva algo antes de publicar.");
  if (conteudo.length > MAX_POST) erroRedir(`Post muito longo (máx. ${MAX_POST} caracteres).`);

  const { error } = await supabase.from("posts").insert({
    matricula_id: ativa.matriculaId,
    turma_id: ativa.turmaId,
    tipo: "texto",
    conteudo,
    status: "publicado",
  });
  if (error) erroRedir(error.message);
  revalidatePath("/feed");
  ok("Publicado.");
}

/** Curte/descurte um post (toggle) com a matrícula ativa. */
export async function curtir(formData: FormData) {
  const { supabase, ativa } = await contexto();
  if (!ativa) return erroRedir("Você precisa de uma turma ativa.");
  const postId = String(formData.get("post_id") ?? "");
  if (!postId) erroRedir("Post inválido.");

  const { data: existe } = await supabase
    .from("curtidas")
    .select("id")
    .eq("post_id", postId)
    .eq("matricula_id", ativa.matriculaId)
    .maybeSingle();

  if (existe) {
    const { error } = await supabase
      .from("curtidas")
      .delete()
      .eq("post_id", postId)
      .eq("matricula_id", ativa.matriculaId);
    if (error) erroRedir(error.message);
  } else {
    const { error } = await supabase
      .from("curtidas")
      .insert({ post_id: postId, matricula_id: ativa.matriculaId });
    if (error) erroRedir(error.message);
  }
  revalidatePath("/feed");
  ok();
}

/** Comenta em um post com a matrícula ativa. */
export async function comentar(formData: FormData) {
  const { supabase, ativa } = await contexto();
  if (!ativa) return erroRedir("Você precisa de uma turma ativa.");
  const postId = String(formData.get("post_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  if (!postId) erroRedir("Post inválido.");
  if (!texto) erroRedir("Escreva um comentário.");
  if (texto.length > MAX_COMENTARIO)
    erroRedir(`Comentário muito longo (máx. ${MAX_COMENTARIO} caracteres).`);

  const { error } = await supabase
    .from("comentarios")
    .insert({ post_id: postId, matricula_id: ativa.matriculaId, texto });
  if (error) erroRedir(error.message);
  revalidatePath("/feed");
  ok();
}

/** Exclui um post. RLS permite dono OU staff. */
export async function excluirPost(formData: FormData) {
  const { supabase } = await contexto();
  const postId = String(formData.get("post_id") ?? "");
  if (!postId) erroRedir("Post inválido.");
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) erroRedir(error.message);
  revalidatePath("/feed");
  ok("Post excluído.");
}

/** Exclui um comentário. RLS permite dono OU staff da turma. */
export async function excluirComentario(formData: FormData) {
  const { supabase } = await contexto();
  const comentarioId = String(formData.get("comentario_id") ?? "");
  if (!comentarioId) erroRedir("Comentário inválido.");
  const { error } = await supabase.from("comentarios").delete().eq("id", comentarioId);
  if (error) erroRedir(error.message);
  revalidatePath("/feed");
  ok("Comentário excluído.");
}

/**
 * Moderação (staff): altera o status do post. RLS posts_moderate exige
 * is_staff_turma(). "ocultar" tira da timeline dos membros; "republicar"
 * volta a exibir.
 */
export async function moderarPost(formData: FormData) {
  const { supabase } = await contexto();
  const postId = String(formData.get("post_id") ?? "");
  const acao = String(formData.get("acao") ?? "");
  if (!postId) erroRedir("Post inválido.");
  const novoStatus = acao === "ocultar" ? "oculto" : acao === "republicar" ? "publicado" : null;
  if (!novoStatus) erroRedir("Ação de moderação inválida.");

  const { error } = await supabase.from("posts").update({ status: novoStatus }).eq("id", postId);
  if (error) erroRedir(error.message);
  revalidatePath("/feed");
  ok(novoStatus === "oculto" ? "Post ocultado." : "Post republicado.");
}
