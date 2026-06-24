"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Check-in do dia. Regras: só matrícula ATIVA; SEMPRE o dia corrente da turma
 * (sem backfill/retroativo — o dia nunca vem do formulário); edição = upsert do
 * mesmo (matricula, dia_corrente) dentro do dia. Os triggers recalculam tudo.
 */
export async function submeterCheckin(formData: FormData) {
  // Volta para a tela de origem (dashboard ou /protocolo/[n]); só aceita path interno.
  const retornoRaw = String(formData.get("retorno") ?? "/dashboard");
  const retorno =
    retornoRaw.startsWith("/") && !retornoRaw.startsWith("//") ? retornoRaw : "/dashboard";

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
  const dia = Number(diaData);
  if (!dia || dia < 1) redirect(`${retorno}?erro=fora_da_janela`);

  // upsert do check-in — SEMPRE no dia corrente
  const { data: ckRow, error: e1 } = await supabase
    .from("checkins")
    .upsert(
      {
        matricula_id: m!.id,
        dia_numero: dia,
        data: new Date().toISOString().slice(0, 10),
        missao_completa: formData.get("missao") === "on",
        check_in_publico: formData.get("publico") === "on",
      },
      { onConflict: "matricula_id,dia_numero" },
    )
    .select("id")
    .single();
  if (e1) redirect(`${retorno}?erro=${encodeURIComponent(e1.message)}`);
  const checkinId = (ckRow as { id: string }).id;

  // sincroniza os 10 inegociáveis (cumprido conforme checkbox)
  const { data: habs } = await supabase
    .from("habitos_definicao")
    .select("id")
    .eq("programa_id", m!.turmas!.programa_id);
  const habitos = (habs ?? []) as { id: string }[];
  const linhas = habitos.map((h) => ({
    checkin_id: checkinId,
    habito_id: h.id,
    cumprido: formData.get(`habito_${h.id}`) === "on",
  }));
  if (linhas.length) {
    const { error: e2 } = await supabase
      .from("checkin_habitos")
      .upsert(linhas, { onConflict: "checkin_id,habito_id" });
    if (e2) redirect(`${retorno}?erro=${encodeURIComponent(e2.message)}`);
  }

  // Check-in do Dia (checklist por dia, SEM pontuação). Aditivo: não interfere
  // em hábitos/missão/scoring. Marcações ficam em protocolo_checkin_respostas.
  const { data: diaRow } = await supabase
    .from("protocolo_dias")
    .select("id")
    .eq("programa_id", m!.turmas!.programa_id)
    .eq("numero", dia)
    .maybeSingle();
  const diaId = (diaRow as { id: string } | null)?.id;
  if (diaId) {
    const { data: itensRows } = await supabase
      .from("protocolo_checkin_itens")
      .select("id")
      .eq("dia_id", diaId);
    const itens = (itensRows ?? []) as { id: string }[];
    if (itens.length) {
      const respostas = itens.map((it) => ({
        checkin_id: checkinId,
        item_id: it.id,
        marcado: formData.get(`item_${it.id}`) === "on",
      }));
      await supabase
        .from("protocolo_checkin_respostas")
        .upsert(respostas, { onConflict: "checkin_id,item_id" });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/protocolo");
  revalidatePath(retorno);
  redirect(`${retorno}?ok=checkin`);
}
