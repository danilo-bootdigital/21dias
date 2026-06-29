import { notFound } from "next/navigation";
import { nomeDeGuerreiro } from "@/lib/identity";
import type { NivelKey } from "@/lib/jornada/nivel";
import { RankingView, type RankRow } from "../(app)/ranking/_components/ranking-view";

/**
 * Preview DEV-ONLY do Ranking (404 em produção). Exercita o redesign completo
 * com dados mockados. O nome é resolvido pela regra única lib/identity.ts
 * (nome_guerreiro → "Novo Guerreiro"). Nunca e-mail. A última linha demonstra o
 * fallback (sem nome de guerreiro definido).
 */
export default function RankingPreview() {
  if (process.env.NODE_ENV === "production") notFound();

  const participantes: {
    posicao: number;
    valor: number;
    ehVoce: boolean;
    nomeGuerreiro?: string | null;
    nivel: NivelKey;
    disciplina: number;
    tendencia: number;
  }[] = [
    { posicao: 1, valor: 1240, ehVoce: false, nomeGuerreiro: "Danilo Oliveira", nivel: "guerreiro_formado", disciplina: 96, tendencia: 120 },
    { posicao: 2, valor: 1180, ehVoce: false, nomeGuerreiro: "João Silva", nivel: "guerreiro", disciplina: 88, tendencia: 80 },
    { posicao: 3, valor: 1095, ehVoce: false, nomeGuerreiro: "Carlos Henrique", nivel: "guerreiro", disciplina: 81, tendencia: 45 },
    { posicao: 4, valor: 1010, ehVoce: false, nomeGuerreiro: "Marina Costa", nivel: "sobrevivente", disciplina: 74, tendencia: 30 },
    { posicao: 5, valor: 980, ehVoce: true, nomeGuerreiro: "Você Guerreiro", nivel: "sobrevivente", disciplina: 78, tendencia: 45 },
    { posicao: 6, valor: 940, ehVoce: false, nomeGuerreiro: "Pedro Alves", nivel: "sobrevivente", disciplina: 66, tendencia: 20 },
    { posicao: 7, valor: 880, ehVoce: false, nomeGuerreiro: "Rafael Lima", nivel: "recruta", disciplina: 52, tendencia: 0 },
    { posicao: 8, valor: 815, ehVoce: false, nomeGuerreiro: null, nivel: "recruta", disciplina: 41, tendencia: 0 }, // fallback → "Novo Guerreiro"
  ];

  const rows: RankRow[] = participantes.map((p) => ({
    posicao: p.posicao,
    valor: p.valor,
    ehVoce: p.ehVoce,
    nome: nomeDeGuerreiro(p.nomeGuerreiro),
    nivel: p.nivel,
    disciplina: p.disciplina,
    tendencia: p.tendencia || undefined,
  }));

  return (
    <div className="mx-auto min-h-[100dvh] max-w-screen-sm px-5 pb-24 pt-6">
      <RankingView tab="geral" rows={rows} metricaLabel="Pontos" totalGuerreiros={rows.length} />
    </div>
  );
}
