"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/cards";
import { Eyebrow, ScreenTitle, Divider } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import { Medal, type MedalTier } from "@/components/ui/medal";
import { ProgressBar } from "@/components/ui/progress";
import { NIVEL_INFO, nivelLabel, type NivelKey } from "@/lib/jornada/nivel";

/**
 * Ranking da Turma — redesign premium (mobile-first), SÓ UI/UX.
 * Dados (posição, métrica, ehVoce) vêm das views ranking_*; identidade/nível/
 * disciplina/tendência vêm de ranking_turma() — montados em page.tsx. Nenhuma
 * regra de ranking/pontuação/medalha é recalculada: medalha de pódio é regra
 * VISUAL por posição; medalha por nível é EXIBIÇÃO de nivel_atual.
 * Componentes 100% do Design System. Motion: fade · slide · progress · hover.
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

const tierPorPosicao = (p: number): MedalTier => (p === 1 ? "ouro" : p === 2 ? "prata" : "bronze");

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

/** Avatar com a medalha do nível atual no canto (cada guerreiro exibe a sua). */
function AvatarNivel({
  foto,
  nome,
  nivel,
  size,
  anel = "soft",
}: {
  foto?: string | null;
  nome?: string;
  nivel?: NivelKey;
  size: number;
  /** Moldura da foto: dourada (Você) ou sutil (demais). */
  anel?: "gold" | "soft";
}) {
  const i = nivel ? NIVEL_INFO[nivel] : null;
  const badge = Math.max(16, Math.round(size * 0.42));
  const style = { width: size, height: size, "--b": `${badge}px` } as CSSProperties;
  const anelCls =
    anel === "gold"
      ? "ring-2 ring-gold/70 ring-offset-2 ring-offset-ground"
      : "ring-1 ring-white/10";
  return (
    <span className="relative shrink-0" style={style}>
      <Avatar src={foto} nome={nome} size={size} className={anelCls} />
      {i ? (
        <Medal
          tier={i.tier}
          size="sm"
          glow={i.glow}
          icon={i.numero}
          ariaLabel={`Disciplina nível ${i.numero}`}
          className="!absolute -bottom-1 -right-1 !size-[var(--b)] border-2 border-ground font-display !text-[0.62rem] font-extrabold"
        />
      ) : null}
    </span>
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

/** Pódio (top 3) — medalhas grandes, líder ao centro e elevado. */
function Podio({ top, metricaLabel }: { top: RankRow[]; metricaLabel: string }) {
  // `top` já vem em ordem de classificação. NÃO indexar por posicao (rank() gera
  // empates/lacunas: 1,1,3 sem o "2"). Visual: 2ª linha · líder · 3ª linha.
  const lider = top[0];
  const ordem = top.length >= 3 ? [top[1], top[0], top[2]] : top;
  const cols = top.length >= 3 ? "grid-cols-3" : top.length === 2 ? "grid-cols-2" : "grid-cols-1";
  return (
    <section aria-label="Pódio" className={`grid items-end gap-2 ${cols}`}>
      {ordem.map((r, idx) => {
        const primeiro = r === lider;
        return (
          <Reveal
            key={idx}
            delay={idx * 70}
            className={`flex flex-col items-center rounded-2xl border px-2 pb-3 text-center ${
              primeiro ? "pt-5" : "pt-3"
            } ${
              r.ehVoce
                ? "border-gold bg-gold/[0.08] shadow-glow-gold"
                : primeiro
                  ? "border-gold/40 bg-surface-raised"
                  : "border-border bg-surface"
            }`}
          >
            <Medal
              tier={tierPorPosicao(r.posicao)}
              size={primeiro ? "lg" : "md"}
              glow={primeiro}
              icon={r.posicao}
              ariaLabel={`${r.posicao}º lugar`}
              className="font-display font-extrabold"
            />
            <span className="mt-2">
              <AvatarNivel foto={r.foto} nome={r.nome} nivel={r.nivel} size={primeiro ? 52 : 44} anel={r.ehVoce ? "gold" : "soft"} />
            </span>
            <p
              className={`mt-1.5 w-full truncate text-sm font-semibold ${
                r.ehVoce ? "text-gold-bright" : "text-text"
              }`}
            >
              {r.ehVoce ? "Você" : r.nome}
            </p>
            <p className="font-display text-base font-extrabold tabular-nums text-text">{r.valor}</p>
            <p className="text-[0.6rem] uppercase tracking-wider text-subtle">{metricaLabel}</p>
          </Reveal>
        );
      })}
    </section>
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
  // Pódio = as 3 primeiras COLOCAÇÕES por ordem real; lista = o restante.
  // Usar slice (não filtrar por posicao<=3): rank() gera empates/lacunas.
  const top = rows.slice(0, 3);
  const resto = rows.slice(3);

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
          {/* Card "Sua posição" — maior destaque da tela */}
          {minha ? (
            <section>
              <Eyebrow className="mb-2">Sua posição</Eyebrow>
              <Reveal>
                <div className="rounded-2xl border border-gold/60 bg-surface-raised p-5 shadow-glow-gold">
                  <div className="flex items-center gap-4">
                    <AvatarNivel foto={minha.foto} nome={minha.nome} nivel={minha.nivel} size={64} anel="gold" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {minha.posicao <= 3 ? (
                          <Medal
                            tier={tierPorPosicao(minha.posicao)}
                            size="sm"
                            glow={minha.posicao === 1}
                            icon={minha.posicao}
                            ariaLabel={`${minha.posicao}º lugar`}
                            className="font-display font-extrabold"
                          />
                        ) : null}
                        <span className="text-xs uppercase tracking-wider text-subtle">
                          {minha.posicao}º lugar
                        </span>
                      </div>
                      <p className="h-card mt-0.5 truncate text-gold-bright">{minha.nome}</p>
                      {minha.nivel ? (
                        <p className="truncate text-sm text-muted">
                          {nivelLabel(minha.nivel)} · {NIVEL_INFO[minha.nivel].nome}
                        </p>
                      ) : null}
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

          {/* Pódio (top 3) */}
          {top.length > 0 ? <Podio top={top} metricaLabel={metricaLabel} /> : null}

          {/* Classificação (4º em diante) */}
          {resto.length > 0 ? (
            <section className="flex flex-col gap-2">
              <Divider label="Classificação" />
              {resto.map((r, idx) => (
                <Reveal key={idx} delay={Math.min(idx, 8) * 40}>
                  <div
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors duration-fast ease-standard ${
                      r.ehVoce
                        ? "border-gold bg-gold/[0.08] shadow-glow-gold"
                        : "border-border bg-surface hover:border-gold/40"
                    }`}
                  >
                    <span className="w-7 shrink-0 text-center font-display font-bold tabular-nums text-subtle">
                      {r.posicao}
                    </span>
                    <AvatarNivel foto={r.foto} nome={r.nome} nivel={r.nivel} size={40} anel={r.ehVoce ? "gold" : "soft"} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-medium ${
                          r.ehVoce ? "text-gold-bright" : "text-text"
                        }`}
                      >
                        {r.ehVoce ? "Você" : r.nome}
                      </p>
                      {r.nivel ? (
                        <p className="truncate text-xs text-subtle">
                          Nível {NIVEL_INFO[r.nivel].numero} · {NIVEL_INFO[r.nivel].nome}
                        </p>
                      ) : null}
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
          ) : null}
        </>
      )}
    </div>
  );
}
