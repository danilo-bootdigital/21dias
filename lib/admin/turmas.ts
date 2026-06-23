"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { audit } from "@/lib/admin/audit";

async function gateAdmin() {
  const supabase = await createServerSupabase();
  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (!ehAdmin) redirect("/perfil");
  return supabase;
}

export async function criarTurma(formData: FormData) {
  const supabase = await gateAdmin();
  const payload = {
    programa_id: String(formData.get("programa_id") ?? ""),
    codigo: String(formData.get("codigo") ?? "").trim(),
    timezone: String(formData.get("timezone") ?? "America/Sao_Paulo"),
    starts_at: String(formData.get("starts_at") ?? "") || null,
    tamanho_max: formData.get("tamanho_max") ? Number(formData.get("tamanho_max")) : null,
    status: "agendada" as const,
  };
  const { data, error } = await supabase.from("turmas").insert(payload).select("id").single();
  if (error) redirect(`/admin/turmas/nova?erro=${encodeURIComponent(error.message)}`);
  const id = (data as { id: string }).id;
  await audit("turma_criada", `turma:${id}`, {
    codigo: payload.codigo,
    programa_id: payload.programa_id,
  });
  revalidatePath("/admin/turmas");
  redirect(`/admin/turmas/${id}?ok=1`);
}

export async function editarTurma(formData: FormData) {
  const supabase = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const patch = {
    codigo: String(formData.get("codigo") ?? "").trim(),
    status: String(formData.get("status") ?? "agendada"),
    timezone: String(formData.get("timezone") ?? "America/Sao_Paulo"),
    starts_at: String(formData.get("starts_at") ?? "") || null,
    ends_at: String(formData.get("ends_at") ?? "") || null,
    tamanho_max: formData.get("tamanho_max") ? Number(formData.get("tamanho_max")) : null,
  };
  const { error } = await supabase.from("turmas").update(patch).eq("id", id);
  if (error) redirect(`/admin/turmas/${id}?erro=${encodeURIComponent(error.message)}`);
  await audit("turma_editada", `turma:${id}`, patch);
  revalidatePath(`/admin/turmas/${id}`);
  redirect(`/admin/turmas/${id}?ok=1`);
}

export async function togglePublicarPrograma(formData: FormData) {
  const supabase = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const publicar = String(formData.get("publicar") ?? "false") === "true";
  const { error } = await supabase
    .from("programas")
    .update({ is_publicado: publicar })
    .eq("id", id);
  if (!error) await audit("programa_publicacao", `programa:${id}`, { is_publicado: publicar });
  revalidatePath("/admin/programas");
  redirect("/admin/programas");
}

export async function togglePublicarTemporada(formData: FormData) {
  const supabase = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const publicar = String(formData.get("publicar") ?? "false") === "true";
  const { error } = await supabase
    .from("temporadas")
    .update({ is_publicado: publicar })
    .eq("id", id);
  if (!error) await audit("temporada_publicacao", `temporada:${id}`, { is_publicado: publicar });
  revalidatePath("/admin/programas");
  redirect("/admin/programas");
}

/** Fallback admin: encerra a turma manualmente (auditado pela própria função SQL). */
export async function encerrarTurmaManual(formData: FormData) {
  const supabase = await gateAdmin();
  const id = String(formData.get("id") ?? "");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: adminRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user!.id)
    .maybeSingle();
  const actor = (adminRow as { id: string } | null)?.id ?? null;
  const { error } = await supabase.rpc("encerrar_turma", { p_turma: id, p_actor: actor });
  if (error) redirect(`/admin/turmas/${id}?erro=${encodeURIComponent(error.message)}`);
  revalidatePath(`/admin/turmas/${id}`);
  redirect(`/admin/turmas/${id}?ok=encerrada`);
}
