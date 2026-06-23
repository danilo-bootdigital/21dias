import { jornadaContexto } from "@/lib/jornada/contexto";
import { RankingTabs } from "@/components/jornada";

const VIEWS: Record<string, { view: string; col: string; label: string }> = {
  geral: { view: "ranking_geral", col: "pontos_total", label: "Pontos" },
  semanal: { view: "ranking_semanal", col: "pontos_semana", label: "Pontos da semana" },
  presenca: { view: "ranking_presenca", col: "streak_atual", label: "Streak (dias)" },
};

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam && VIEWS[tabParam] ? tabParam : "geral";
  const { view, col, label } = VIEWS[tab];

  const ctx = await jornadaContexto();
  if (!ctx || ctx.matriculas.length === 0) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold">Ranking</h1>
        <p className="mt-3 text-muted">Você ainda não participa de nenhuma turma.</p>
      </div>
    );
  }

  const { supabase, matriculas, ativa } = ctx;
  const turmaId = ativa?.turma_id ?? matriculas[0].turma_id;
  const minhasIds = new Set(matriculas.map((m) => m.id));

  const { data } = await supabase
    .from(view)
    .select(`matricula_id, turma_id, posicao, ${col}`)
    .eq("turma_id", turmaId)
    .order("posicao", { ascending: true });

  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    posicao: Number(r.posicao),
    valor: Number(r[col] ?? 0),
    ehVoce: minhasIds.has(String(r.matricula_id)),
  }));

  return (
    <div>
      <h1 className="mb-4 font-display text-3xl font-semibold">Ranking da turma</h1>
      <RankingTabs tab={tab} rows={rows} metricaLabel={label} />
    </div>
  );
}
