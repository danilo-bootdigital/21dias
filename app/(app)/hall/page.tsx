import { jornadaContexto } from "@/lib/jornada/contexto";
import { HallList } from "@/components/jornada";

export default async function HallPage() {
  const ctx = await jornadaContexto();
  if (!ctx || ctx.matriculas.length === 0) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold">Hall dos Guerreiros</h1>
        <p className="mt-3 text-muted">Você ainda não participa de nenhuma turma.</p>
      </div>
    );
  }

  const { supabase, matriculas, ativa } = ctx;
  const turmaId = ativa?.turma_id ?? matriculas[0].turma_id;
  const minhasIds = new Set(matriculas.map((m) => m.id));

  const { data: tRow } = await supabase
    .from("turmas")
    .select("codigo")
    .eq("id", turmaId)
    .maybeSingle();
  const turmaCodigo = (tRow as { codigo: string } | null)?.codigo ?? "";

  const { data } = await supabase
    .from("hall_entries")
    .select("posicao, nivel_final, disciplina_final, matricula_id")
    .eq("turma_id", turmaId)
    .order("posicao", { ascending: true });

  const entries = (
    (data ?? []) as {
      posicao: number | null;
      nivel_final: string | null;
      disciplina_final: number | null;
      matricula_id: string;
    }[]
  ).map((e) => ({
    posicao: e.posicao ?? 0,
    nivel: e.nivel_final,
    disciplina: e.disciplina_final === null ? null : Number(e.disciplina_final),
    ehVoce: minhasIds.has(e.matricula_id),
  }));

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Hall dos Guerreiros</h1>
      <p className="mb-4 mt-1 text-sm text-subtle">Turma {turmaCodigo}</p>
      <HallList entries={entries} />
    </div>
  );
}
