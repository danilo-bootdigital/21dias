"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/cards";
import { Eyebrow, ScreenTitle, Divider } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import { Medal, type MedalTier } from "@/components/ui/medal";
import { ProgressBar } from "@/components/ui/progress";
import { NIVEL_INFO, type NivelKey } from "@/lib/jornada/nivel";

/**
 * Ranking da Turma — lista única (mobile-first), SÓ UI/UX. Sem pódio: todos os
 * colocados em linha; os 3 primeiros são destacados por um detalhe de BORDA na
 * cor do metal. O selo de nível de cada guerreiro é uma medalha (cor do nível)
 * com o nome do metal (Ouro/Prata/Bronze) ao lado do nome. Nenhuma regra de
 * ranking/pontuação é recalculada. Componentes 100% do Design System.
 */
export type RankRow = {
  posicao: number;
  valor: number | string;
  ehVoce: boolean;
  nome?: string;
  foto?: string | null;
  nivel?: NivelKey;
  disciplina?: number;
  tendencia?: number;
};

const TABS = [
  { key: "geral", label: "Geral" },
  { key: "semanal", label: "Semanal" },
  { key: "presenca", label: "Presença" },
];

const METAL: Record<MedalTier, string> = { ouro: "Ouro", prata: "Prata", bronze: "Bronze" };

/** Moldura da foto: dourada (Você) ou sutil (demais). */
const anelCls = (ehVoce: boolean) =>
  ehVoce ? "ring-2 ring-gold/70 ring-offset-2 ring-offset-ground" : "ring-1 ring-white/10";

/** Borda de destaque por colocação (top 3) e Você. */
function bordaCls(r: RankRow): string {
  if (r.ehVoce) return "border-gold bg-gold/[0.08] shadow-glow-gold";
  if (r.posicao === 1) return "border-gold/70 bg-surface";
  if (r.posicao === 2) return "border-zinc-300/60 bg-surface";
  if (r.posicao === 3) return "border-amber-700/50 bg-surface";
  return "border-border bg-surface hover:border-gold/40";
}

/** Cor do número da posição (acompanha o metal nos 3 primeiros). */
function numCls(r: RankRow): string {
  if (r.posicao === 1) return "text-gold-bright";
  if (r.posicao === 2) return "text-zinc-200";
  if (r.posicao === 3) return "text-amber-500";
  return "text-subtle";
}

/** Fade + slide na montagem (Motion Language). Respeita prefers-reduced-motion. */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-slow ease-standard motion-reduce:transition-none motion-reduce:!translate-y-0 motion-reduce:!opacity-100 ${
        on ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Tendencia({ v }: { v: number }) {
  if (!v) return null;
  const sobe = v >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
        sobe ? "text-success" : "text-danger"
      }`}
    >
      {sobe ? "↗" : "↘"} {sobe ? "+" : ""}
      {v}
    </span>
  );
}

/** Selo de nível: medalha (cor do nível) + nome do metal (Ouro/Prata/Bronze). */
function SeloNivel({ nivel }: { nivel?: NivelKey }) {
  if (!nivel) return null;
  const i = NIVEL_INFO[nivel];
  return (
    <span className="mt-0.5 inline-flex items-center gap-1.5">
      <Medal
        tier={i.tier}
        size="sm"
        glow={i.glow}
        icon={i.numero}
        ariaLabel={`Nível ${i.numero} · ${METAL[i.tier]}`}
        className="!size-5 border border-ground font-display !text-[0.6rem] font-extrabold"
      />
      <span className="truncate text-xs text-subtle">
        Nível {i.numero} · {METAL[i.tier]}
      </span>
    </span>
  );
}

export function RankingView({
  tab,
  rows,
  metricaLabel,
  totalGuerreiros,
}: {
  tab: string;
  rows: RankRow[];
  metricaLabel: string;
  totalGuerreiros?: number;
}) {
  const router = useRouter();
  const total = totalGuerreiros ?? rows.length;
  const minha = rows.find((r) => r.ehVoce) ?? null;
  const unidade = /dias|streak/i.test(metricaLabel) ? "dias" : "pts";

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho premium */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <ScreenTitle>Ranking da Turma</ScreenTitle>
          <p className="mt-1 text-sm text-muted">Competição diária. Disciplina que transforma.</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-gold/30 bg-surface px-3 py-2 text-center">
          <p className="font-display text-lg font-extrabold tabular-nums text-gold-bright">👥 {total}</p>
          <p className="text-[0.6rem] uppercase tracking-wider text-subtle">Guerreiros</p>
        </div>
      </header>

      <Tabs tabs={TABS} initial={tab} onChange={(k) => router.replace(`/ranking?tab=${k}`)} />

      {rows.length === 0 ? (
        <EmptyState titulo="Ranking em formação">
          Faça o seu check-in de hoje para entrar na disputa da turma.
        </EmptyState>
      ) : (
        <>
          {/* Card "Sua posição" — destaque pessoal */}
          {minha ? (
            <section>
              <Eyebrow className="mb-2">Sua posição</Eyebrow>
              <Reveal>
                <div className="rounded-2xl border border-gold/60 bg-gradient-to-br from-surface-raised via-surface-raised to-gold/10 p-5 shadow-glow-gold">
                  <div className="flex items-center gap-4">
                    <Avatar src={minha.foto} nome={minha.nome} size={64} className={anelCls(true)} />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs uppercase tracking-wider text-subtle">
                        {minha.posicao}º lugar
                      </span>
                      <p className="h-card mt-0.5 truncate text-gold-bright">{minha.nome}</p>
                      <SeloNivel nivel={minha.nivel} />
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-3xl font-extrabold leading-none tabular-nums text-gold-bright">
                        {minha.valor}
                      </p>
                      <p className="mt-1 text-xs text-subtle">{metricaLabel}</p>
                    </div>
                  </div>
                  {minha.disciplina != null ? (
                    <div className="mt-4">
                      <ProgressBar
                        value={minha.disciplina}
                        label={`Disciplina · ${Math.round(minha.disciplina)}%`}
                        playKey={tab}
                      />
                    </div>
                  ) : null}
                </div>
              </Reveal>
            </section>
          ) : null}

          {/* Classificação — tudo em linha; top 3 destacados por borda */}
          <section className="flex flex-col gap-2">
            <Divider label="Classificação" />
            {rows.map((r, idx) => (
              <Reveal key={idx} delay={Math.min(idx, 10) * 35}>
                <div
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors duration-fast ease-standard ${bordaCls(r)}`}
                >
                  <span className={`w-7 shrink-0 text-center font-display font-bold tabular-nums ${numCls(r)}`}>
                    {r.posicao}
                  </span>
                  <Avatar src={r.foto} nome={r.nome} size={40} className={anelCls(r.ehVoce)} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        r.ehVoce ? "text-gold-bright" : "text-text"
                      }`}
                    >
                      {r.ehVoce ? "Você" : r.nome}
                    </p>
                    <SeloNivel nivel={r.nivel} />
                  </div>
                  {r.tendencia != null ? <Tendencia v={r.tendencia} /> : null}
                  <div className="shrink-0 text-right">
                    <p className="font-display font-bold tabular-nums text-text">{r.valor}</p>
                    <p className="text-[0.6rem] uppercase tracking-wider text-subtle">{unidade}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
