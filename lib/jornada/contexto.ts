import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

/** Contexto de jornada do usuário autenticado: matrículas próprias + a ativa. */
export async function jornadaContexto() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: duRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const domainId = (duRow as { id: string } | null)?.id ?? null;
  if (!domainId)
    return {
      supabase,
      domainId: null,
      matriculas: [],
      ativa: null as null | { id: string; turma_id: string; status: string },
    };
  const { data } = await supabase
    .from("matriculas")
    .select("id, turma_id, status, turmas(status)")
    .eq("user_id", domainId)
    .order("joined_at", { ascending: false });
  const rows = (data ?? []) as unknown as {
    id: string;
    turma_id: string;
    status: string;
    turmas: { status: string } | null;
  }[];
  const matriculas = rows.map(({ id, turma_id, status }) => ({ id, turma_id, status }));
  // "ativa" exige matrícula ativa E turma ativa (alinha com submeterCheckin).
  const ativaRow = rows.find((m) => m.status === "ativa" && m.turmas?.status === "ativa") ?? null;
  const ativa = ativaRow
    ? { id: ativaRow.id, turma_id: ativaRow.turma_id, status: ativaRow.status }
    : null;
  return { supabase, domainId, matriculas, ativa };
}
