"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Registra os envios de imagem do guerreiro para um campo de imagem do dia.
 * As imagens já foram enviadas ao Storage no cliente (bucket 'protocolos',
 * pasta do próprio auth.uid); aqui só persistimos as URLs.
 *
 * Regras (alinhadas ao check-in): exige matrícula ATIVA + turma ATIVA + dia
 * corrente, e que o campo (slot) esteja ATIVO para o dia. Desacoplado do
 * scoring — não toca em checkins/pontuação.
 */
export async function registrarImagensProtocolo(formData: FormData) {
  const retornoRaw = String(formData.get("retorno") ?? "/protocolo");
  const retorno =
    retornoRaw.startsWith("/") && !retornoRaw.startsWith("//") ? retornoRaw : "/protocolo";

  const slot = Number(formData.get("slot"));
  const diaNumero = Number(formData.get("dia_numero"));
  const urls = formData
    .getAll("url")
    .map((u) => String(u).trim())
    .filter(Boolean);

  if (![1, 2, 3].includes(slot)) redirect(`${retorno}?erro=campo_invalido`);
  if (!urls.length) redirect(`${retorno}?erro=sem_imagem`);

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: duRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const domainId = (duRow as { id: string } | null)?.id;
  if (!domainId) redirect(`${retorno}?erro=sem_usuario`);

  const { data: mRow } = await supabase
    .from("matriculas")
    .select("id, turma_id, turmas(programa_id, status)")
    .eq("user_id", domainId)
    .eq("status", "ativa")
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const m = mRow as unknown as {
    id: string;
    turma_id: string;
    turmas: { programa_id: string; status: string } | null;
  } | null;
  if (!m) redirect(`${retorno}?erro=sem_matricula_ativa`);
  if (m!.turmas?.status !== "ativa") redirect(`${retorno}?erro=turma_inativa`);

  const { data: diaData } = await supabase.rpc("dia_corrente_turma", { p_turma: m!.turma_id });
  const diaCorrente = Number(diaData);
  if (!diaCorrente || diaNumero !== diaCorrente) redirect(`${retorno}?erro=fora_da_janela`);

  // O campo precisa existir e estar ATIVO para o dia corrente.
  const { data: diaRow } = await supabase
    .from("protocolo_dias")
    .select("id")
    .eq("programa_id", m!.turmas!.programa_id)
    .eq("numero", diaNumero)
    .maybeSingle();
  const diaId = (diaRow as { id: string } | null)?.id;
  if (!diaId) redirect(`${retorno}?erro=dia_invalido`);

  const { data: campoRow } = await supabase
    .from("protocolo_imagem_campos")
    .select("ativo")
    .eq("dia_id", diaId)
    .eq("slot", slot)
    .maybeSingle();
  if (!(campoRow as { ativo: boolean } | null)?.ativo) redirect(`${retorno}?erro=campo_inativo`);

  const linhas = urls.map((url) => ({
    matricula_id: m!.id,
    dia_numero: diaNumero,
    slot,
    url,
  }));
  const { error } = await supabase.from("protocolo_imagem_envios").insert(linhas);
  if (error) redirect(`${retorno}?erro=${encodeURIComponent(error.message)}`);

  revalidatePath(retorno);
  redirect(`${retorno}?ok=imagem_enviada`);
}
