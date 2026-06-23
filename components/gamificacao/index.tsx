import { getEvolutionReward } from "@/lib/gamificacao/recompensa";

/**
 * Badge/medalha calculada a partir do percentual de evolução.
 * Não renderiza nada abaixo de 30% (sem medalha).
 */
export function MedalhaBadge({
  percentual,
  className = "",
}: {
  percentual: number;
  className?: string;
}) {
  const r = getEvolutionReward(percentual);
  if (!r.temMedalha) return null;
  return (
    <span
      title={`${r.label} · ${r.faixa}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${r.classeBadge} ${className}`}
    >
      <span aria-hidden="true">{r.icone}</span>
      {r.label}
    </span>
  );
}

/**
 * Nome do guerreiro com destaque visual + medalha ao lado,
 * conforme o percentual de evolução atual. Componente reutilizável:
 * use em qualquer lugar onde o nome apareça com status de evolução.
 */
export function NomeComMedalha({
  nome,
  percentual,
  as: Tag = "span",
  className = "",
  mostrarBadge = true,
}: {
  nome: string;
  percentual: number;
  as?: "span" | "h1" | "h2" | "p";
  className?: string;
  mostrarBadge?: boolean;
}) {
  const r = getEvolutionReward(percentual);
  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <Tag className={r.classeNome}>{nome}</Tag>
      {mostrarBadge ? <MedalhaBadge percentual={percentual} /> : null}
    </span>
  );
}
