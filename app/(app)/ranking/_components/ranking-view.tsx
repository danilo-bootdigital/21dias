"use client";

import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/cards";
import { Eyebrow } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import { Medal, type MedalTier } from "@/components/ui/medal";
import { ProgressBar } from "@/components/ui/progress";

/**
 * Ranking da Turma — redesign premium (mobile-first), só UI/UX.
 * Usa os dados já carregados (posição, métrica, ehVoce). Campos ricos
 * (nome, foto, nivel, disciplina, tendencia) são OPCIONAIS: ausentes na página
 * real (RLS anonimiza; sem query extra) e preenchidos por mock no preview.
 * Nenhuma regra de ranking/pontuação/medalha é alterada — medalha de pódio é
 * regra visual por posição.
 */
export type RankRow = {
  posicao: number;
  valor: number | string;
  ehVoce: boolean;
  nome?: string;
  foto?: string | null;
  nivel?: string;
  disciplina?: number;
  tendencia?: number;
};

const TABS = [
  { key: "geral", label: "Geral" },
  { key: "semanal", label: "Semanal" },
  { key: "presenca", label: "Presença" },
];

const tierPorPosicao = (p: number): MedalTier => (p === 1 ? "ouro" : p === 2 ? "prata" : "bronze");

function Tendencia({ v }: { v: number }) {
  const sobe = v >= 0;
  return (
    <span className={`flex shrink-0 items-center gap-0.5 text-xs font-semibold ${sobe ? "text-success" : "text-danger"}`}>
      {sobe ? "↗" : "↘"} {sobe ? "+" : ""}
      {v}
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
      {/* Cabeçalho + contagem */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Ranking da Turma</h1>
          <p className="mt-1 text-sm text-muted">Competição diária. Disciplina que transforma.</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-border bg-surface px-3 py-2 text-center">
          <p className="font-display text-lg font-extrabold tabular-nums">👥 {total}</p>
          <p className="text-[0.62rem] uppercase tracking-wider text-subtle">Guerreiros</p>
        </div>
      </header>

      <Tabs tabs={TABS} initial={tab} onChange={(k) => router.replace(`/ranking?tab=${k}`)} />

      {/* Card "Sua posição" — destaque premium */}
      {minha ? (
        <section>
          <Eyebrow className="mb-2">Sua posição</Eyebrow>
          <div className="rounded-2xl border border-gold/60 bg-surface-raised p-5 shadow-glow-gold motion-safe:animate-[sheet-up_240ms_cubic-bezier(0.2,0,0,1)]">
            <div className="flex items-center gap-4">
              <Avatar src={minha.foto} nome={minha.nome ?? "Você"} size={56} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {minha.posicao <= 3 ? (
                    <Medal tier={tierPorPosicao(minha.posicao)} size="sm" glow={minha.posicao === 1} />
                  ) : null}
                  <span className="text-xs uppercase tracking-wider text-subtle">{minha.posicao}º lugar</span>
                </div>
                <p className="h-card mt-0.5 truncate text-gold-bright">{minha.nome ?? "Você"}</p>
                {minha.nivel ? <p className="text-sm text-muted">{minha.nivel}</p> : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-2xl font-extrabold tabular-nums">{minha.valor}</p>
                <p className="text-xs text-subtle">{metricaLabel}</p>
              </div>
            </div>
            {minha.disciplina != null ? (
              <div className="mt-4">
                <ProgressBar value={minha.disciplina} label={`Disciplina · ${minha.disciplina}%`} playKey={tab} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Lista da turma */}
      {rows.length === 0 ? (
        <EmptyState titulo="Ranking em formação">
          Faça o seu check-in de hoje para entrar na disputa da turma.
        </EmptyState>
      ) : (
        <section className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wider text-subtle">A turma · {metricaLabel}</p>
          {rows.map((r) => {
            const podio = r.posicao <= 3;
            const display = r.ehVoce ? "Você" : (r.nome ?? "Guerreiro");
            const mostrarAvatar = !!(r.foto || r.nome) || r.ehVoce;
            return (
              <div
                key={r.posicao}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors duration-fast ease-standard ${
                  r.ehVoce ? "border-gold bg-gold/[0.07]" : "border-border bg-surface hover:border-gold/40"
                }`}
              >
                <div className="flex w-9 shrink-0 justify-center">
                  {podio ? (
                    <Medal tier={tierPorPosicao(r.posicao)} size="sm" glow={r.posicao === 1} />
                  ) : (
                    <span className="font-display font-bold tabular-nums text-subtle">{r.posicao}</span>
                  )}
                </div>
                {mostrarAvatar ? <Avatar src={r.foto} nome={display} size={36} /> : null}
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${r.ehVoce ? "text-gold-bright" : "text-text"}`}>
                    {display}
                  </p>
                  {r.nivel ? <p className="truncate text-xs text-subtle">{r.nivel}</p> : null}
                </div>
                {r.tendencia != null ? <Tendencia v={r.tendencia} /> : null}
                <div className="shrink-0 text-right">
                  <p className="font-display font-bold tabular-nums">{r.valor}</p>
                  <p className="text-[0.6rem] text-subtle">{unidade}</p>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
