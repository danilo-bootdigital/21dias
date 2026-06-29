import { jornadaContexto } from "@/lib/jornada/contexto";
import { nomeDeGuerreiro } from "@/lib/identity";
import { ScreenTitle } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/cards";
import type { NivelKey } from "@/lib/jornada/nivel";
import { RankingView, type RankRow } from "./_components/ranking-view";

/**
 * Ranking — só montagem de dados (reusa as views ranking_* e a RLS existentes).
 * Identidade (nome/foto/nível/disciplina) vem da função ranking_turma() — gated
 * por pertencimento à turma; ver migration 0014. Posições e métricas continuam
 * 100% das views ranking_*: nenhuma regra de ranking/pontuação é recalculada.
 * Apresentação em <RankingView>. Sem tabela, mobile-first.
 */
const VIEWS: Record<string, { view: string; col: string; label: string }> = {
  geral: { view: "ranking_geral", col: "pontos_total", label: "Pontos" },
  semanal: { view: "ranking_semanal", col: "pontos_semana", label: "Pontos da semana" },
  presenca: { view: "ranking_presenca", col: "streak_atual", label: "Streak (dias)" },
};

type Identidade = {
  nome: string | null;
  foto: string | null;
  nivel: NivelKey | null;
  disciplina: number | null;
  pontosSemana: number | null;
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
        <ScreenTitle>Ranking</ScreenTitle>
        <div className="mt-6">
          <EmptyState titulo="Você ainda não está em uma turma">
            Assim que sua jornada começar, a disputa da sua turma aparece aqui.
          </EmptyState>
        </div>
      </div>
    );
  }

  const { supabase, matriculas, ativa } = ctx;
  const turmaId = ativa?.turma_id ?? matriculas[0].turma_id;
  const minhasIds = new Set(matriculas.map((m) => m.id));

  // Posições + métrica: das views (anônimo, RLS). Regra de ranking intocada.
  const { data } = await supabase
    .from(view)
    .select(`matricula_id, turma_id, posicao, ${col}`)
    .eq("turma_id", turmaId)
    .order("posicao", { ascending: true });

  // Identidade + nível + disciplina + pontos da semana (gated por turma).
  const { data: idData } = await supabase.rpc("ranking_turma", { p_turma: turmaId });
  const ident = new Map<string, Identidade>();
  for (const r of (idData ?? []) as Record<string, unknown>[]) {
    ident.set(String(r.matricula_id), {
      nome: (r.nome_guerreiro as string | null) ?? null,
      foto: (r.foto_url as string | null) ?? null,
      nivel: (r.nivel as NivelKey | null) ?? null,
      disciplina: r.indice_disciplina != null ? Number(r.indice_disciplina) : null,
      pontosSemana: r.pontos_semana != null ? Number(r.pontos_semana) : null,
    });
  }

  // "Evolução recente": só faz sentido na aba Geral (pontos ganhos na semana
  // corrente — dado REAL, não mock). Nas outras abas a métrica já é semanal/streak.
  const mostrarTendencia = tab === "geral";

  const rows: RankRow[] = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => {
    const mid = String(r.matricula_id);
    const id = ident.get(mid);
    return {
      posicao: Number(r.posicao),
      valor: Number(r[col] ?? 0),
      ehVoce: minhasIds.has(mid),
      nome: nomeDeGuerreiro(id?.nome), // SEMPRE pela regra única — nunca e-mail.
      foto: id?.foto ?? null,
      nivel: id?.nivel ?? undefined,
      disciplina: id?.disciplina ?? undefined,
      tendencia: mostrarTendencia && id?.pontosSemana != null ? id.pontosSemana : undefined,
    };
  });

  return <RankingView tab={tab} rows={rows} metricaLabel={label} totalGuerreiros={rows.length} />;
}
