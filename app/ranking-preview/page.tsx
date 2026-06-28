import { notFound } from "next/navigation";
import { nomeDeGuerreiro } from "@/lib/identity";
import { RankingView, type RankRow } from "../(app)/ranking/_components/ranking-view";

/**
 * Preview DEV-ONLY do Ranking (404 em produção). O nome exibido é resolvido
 * pela regra única lib/identity.ts (nome_guerreiro → "Novo Guerreiro"). Nunca
 * e-mail. A última linha demonstra o fallback (sem nome de guerreiro definido).
 */
export default function RankingPreview() {
  if (process.env.NODE_ENV === "production") notFound();

  const participantes: {
    posicao: number;
    valor: number;
    ehVoce: boolean;
    nomeGuerreiro?: string | null;
  }[] = [
    { posicao: 1, valor: 1240, ehVoce: false, nomeGuerreiro: "Danilo Oliveira" },
    { posicao: 2, valor: 1180, ehVoce: false, nomeGuerreiro: "João Silva" },
    { posicao: 3, valor: 1095, ehVoce: false, nomeGuerreiro: "Carlos Henrique" },
    { posicao: 4, valor: 1010, ehVoce: false, nomeGuerreiro: "Marina Costa" },
    { posicao: 5, valor: 980, ehVoce: true, nomeGuerreiro: "Você Guerreiro" },
    { posicao: 6, valor: 940, ehVoce: false, nomeGuerreiro: "Pedro Alves" },
    { posicao: 7, valor: 880, ehVoce: false, nomeGuerreiro: "Rafael Lima" },
    { posicao: 8, valor: 815, ehVoce: false, nomeGuerreiro: null }, // fallback → "Novo Guerreiro"
  ];

  const rows: RankRow[] = participantes.map((p) => ({
    posicao: p.posicao,
    valor: p.valor,
    ehVoce: p.ehVoce,
    nome: nomeDeGuerreiro(p.nomeGuerreiro),
  }));

  return (
    <div className="mx-auto min-h-[100dvh] max-w-screen-sm px-5 pb-24 pt-6">
      <RankingView tab="geral" rows={rows} metricaLabel="Pontos" />
    </div>
  );
}
