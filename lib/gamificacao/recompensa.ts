/**
 * Código 21 — Recompensa visual por evolução (medalhas).
 *
 * Regra ÚNICA e centralizada de medalha por percentual de evolução.
 * NÃO altera nenhum cálculo de pontuação/evolução: apenas mapeia um
 * percentual já existente (ex.: índice de disciplina) para um destaque visual.
 *
 * Faixas:
 *   - Sem medalha: 0% a 29%
 *   - Bronze:      30% a 49%
 *   - Prata:       50% a 84%
 *   - Ouro:        85% a 100%
 */

export type EvolutionLevel = "nenhuma" | "bronze" | "prata" | "ouro";

export interface EvolutionReward {
  /** Nível da medalha. */
  nivel: EvolutionLevel;
  /** Rótulo exibível (ex.: "Medalha Ouro"). */
  label: string;
  /** Faixa percentual textual (ex.: "30%–49%"). */
  faixa: string;
  /** Limite inferior da faixa (inclusive). */
  faixaMin: number;
  /** Limite superior da faixa (inclusive). */
  faixaMax: number;
  /** Classe visual aplicada ao NOME (cor/estilo/brilho). */
  classeNome: string;
  /** Classe visual aplicada ao BADGE/medalha (pílula). */
  classeBadge: string;
  /** Ícone/medalha (emoji). Vazio quando não há medalha. */
  icone: string;
  /** Prioridade crescente (0 = sem medalha … 3 = ouro). Útil para ordenação. */
  prioridade: number;
  /** Conveniência: há medalha a exibir? (false abaixo de 30%). */
  temMedalha: boolean;
}

/**
 * Normaliza o percentual recebido:
 *  - nulo/indefinido/NaN  → 0
 *  - negativo             → 0
 *  - acima de 100         → 100
 */
export function normalizarPercentualEvolucao(percentualEvolucao: unknown): number {
  const n = Number(percentualEvolucao);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

const NENHUMA: Omit<EvolutionReward, "faixaMin" | "faixaMax" | "faixa"> = {
  nivel: "nenhuma",
  label: "Sem medalha",
  classeNome: "text-text",
  classeBadge: "",
  icone: "",
  prioridade: 0,
  temMedalha: false,
};

/**
 * Retorna a recompensa visual correspondente ao percentual de evolução.
 *
 * @param percentualEvolucao percentual de 0 a 100 (valores fora da faixa são tratados).
 */
export function getEvolutionReward(percentualEvolucao: number): EvolutionReward {
  const pct = normalizarPercentualEvolucao(percentualEvolucao);

  if (pct >= 85) {
    return {
      nivel: "ouro",
      label: "Medalha Ouro",
      faixa: "85%–100%",
      faixaMin: 85,
      faixaMax: 100,
      // Dourado premium: gradiente no texto + leve brilho.
      classeNome:
        "bg-gradient-to-r from-[#FFE082] via-[#FFD54F] to-[#C8A45D] bg-clip-text font-bold text-transparent drop-shadow-[0_0_8px_rgba(255,213,79,0.45)]",
      classeBadge:
        "border-[#FFD54F]/60 bg-gradient-to-br from-[#FFD54F]/20 to-[#C8A45D]/10 text-[#FFD54F] shadow-[0_0_14px_rgba(255,213,79,0.40)] ring-1 ring-[#FFD54F]/40",
      icone: "🥇",
      prioridade: 3,
      temMedalha: true,
    };
  }

  if (pct >= 50) {
    return {
      nivel: "prata",
      label: "Medalha Prata",
      faixa: "50%–84%",
      faixaMin: 50,
      faixaMax: 84,
      classeNome: "font-semibold text-[#D4D7DB]",
      classeBadge: "border-[#C0C4CC]/50 bg-[#C0C4CC]/10 text-[#D4D7DB]",
      icone: "🥈",
      prioridade: 2,
      temMedalha: true,
    };
  }

  if (pct >= 30) {
    return {
      nivel: "bronze",
      label: "Medalha Bronze",
      faixa: "30%–49%",
      faixaMin: 30,
      faixaMax: 49,
      classeNome: "font-semibold text-[#CD7F32]",
      classeBadge: "border-[#CD7F32]/50 bg-[#CD7F32]/10 text-[#CD7F32]",
      icone: "🥉",
      prioridade: 1,
      temMedalha: true,
    };
  }

  return { ...NENHUMA, faixa: "0%–29%", faixaMin: 0, faixaMax: 29 };
}
