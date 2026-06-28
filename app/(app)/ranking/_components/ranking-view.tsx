"use client";

import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, RankingRow } from "@/components/ui/cards";
import { Eyebrow, ScreenTitle } from "@/components/ui/primitives";

/**
 * Ranking da turma (Fase 4), só com components/ui. Sem tabela.
 * Contrato (Constituição): primeiro o MEU lugar + o pódio; competição saudável.
 * Anonimizado por padrão (a RLS não expõe nomes/avatares de outras matrículas).
 */

export type RankRow = {
  posicao: number;
  valor: number | string;
  ehVoce: boolean;
  /** Nome do Guerreiro já resolvido (regra: lib/identity.ts). */
  nome?: string;
};

const TABS = [
  { key: "geral", label: "Geral" },
  { key: "semanal", label: "Semanal" },
  { key: "presenca", label: "Presença" },
];

export function RankingView({
  tab,
  rows,
  metricaLabel,
}: {
  tab: string;
  rows: RankRow[];
  metricaLabel: string;
}) {
  const router = useRouter();
  const minha = rows.find((r) => r.ehVoce) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Eyebrow>Competição da turma</Eyebrow>
        <ScreenTitle className="mt-1">Ranking</ScreenTitle>
      </header>

      <Tabs tabs={TABS} initial={tab} onChange={(k) => router.replace(`/ranking?tab=${k}`)} />

      {minha ? (
        <section className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wider text-subtle">Sua posição · {metricaLabel}</p>
          <RankingRow posicao={minha.posicao} valor={minha.valor} ehVoce medalha comAvatar={false} />
        </section>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState titulo="Ranking em formação">
          Faça o seu check-in de hoje para entrar na disputa da turma.
        </EmptyState>
      ) : (
        <section className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wider text-subtle">A turma · {metricaLabel}</p>
          {rows.map((r) => (
            <RankingRow
              key={r.posicao}
              posicao={r.posicao}
              nome={r.nome}
              valor={r.valor}
              ehVoce={r.ehVoce}
              medalha
              comAvatar={false}
            />
          ))}
        </section>
      )}
    </div>
  );
}
