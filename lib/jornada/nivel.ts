import type { MedalTier } from "@/components/ui/medal";

/**
 * Mapeamento de EXIBIÇÃO do nível de disciplina (enum `nivel` do banco) para
 * rótulo + medalha. NÃO altera nenhuma regra: o nível é calculado pelo scoring
 * engine; aqui só decidimos como mostrá-lo. Módulo puro (sem server-only),
 * seguro em Server e Client Components.
 */
export type NivelKey = "recruta" | "sobrevivente" | "guerreiro" | "guerreiro_formado";

export const NIVEL_INFO: Record<
  NivelKey,
  { numero: number; nome: string; tier: MedalTier; glow: boolean }
> = {
  recruta: { numero: 1, nome: "Recruta", tier: "bronze", glow: false },
  sobrevivente: { numero: 2, nome: "Sobrevivente", tier: "prata", glow: false },
  guerreiro: { numero: 3, nome: "Guerreiro", tier: "ouro", glow: false },
  guerreiro_formado: { numero: 4, nome: "Guerreiro Formado", tier: "ouro", glow: true },
};

/** "Disciplina Nível 3" — rótulo curto do nível atual. */
export function nivelLabel(k: NivelKey): string {
  return `Disciplina Nível ${NIVEL_INFO[k].numero}`;
}
