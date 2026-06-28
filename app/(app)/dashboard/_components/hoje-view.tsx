"use client";

import { useState } from "react";
import { submeterCheckin } from "@/lib/jornada/checkin";
import { Button, ButtonLink, Eyebrow, Tag } from "@/components/ui/primitives";
import { Alert } from "@/components/ui/alert";
import { MissionCard, StatCard } from "@/components/ui/cards";
import { ProgressRing } from "@/components/ui/progress";
import { BottomSheet } from "@/components/ui/overlays";
import { Checkbox, Toggle } from "@/components/ui/controls";

/**
 * Tela "Hoje" (Fase 3). Construída só com components/ui, conforme as quatro
 * constituições. Ação única = fazer o check-in (em Bottom Sheet). O que motiva
 * (progresso + missão + sequência) vem primeiro; ranking/pontos não competem.
 * Apresentacional — recebe dados por props e reusa a server action submeterCheckin.
 */

export type HojeData = {
  programaNome: string;
  turmaCodigo: string;
  dia: number;
  duracao: number;
  faseNome: string | null;
  missao: { titulo: string; descricao?: string | null; pontos: number };
  feito: boolean;
  pontosDia: number;
  posicao: number | null;
  streak: number;
  indice: number;
  pontosTotal: number;
  nivel: string;
  podeOperar: boolean;
  habitos: { id: string; nome: string }[];
  cumpridos: string[];
  missaoCompleta: boolean;
  publico: boolean;
  ok?: string;
  erro?: string;
};

export function HojeView(d: HojeData) {
  const [sheet, setSheet] = useState(false);
  const progresso = d.duracao > 0 ? Math.min(100, Math.round((d.dia / d.duracao) * 100)) : 0;
  const avisoOk = d.ok === "checkin" ? "Feito. Mais um dia construído." : d.ok;

  return (
    <div className="flex flex-col gap-6">
      {avisoOk ? <Alert tone="success">{avisoOk}</Alert> : null}
      {d.erro ? <Alert tone="danger">{decodeURIComponent(d.erro)}</Alert> : null}

      {/* HERÓI — progresso + sequência + estado do dia */}
      <header className="flex flex-col gap-4">
        <Eyebrow>
          {d.programaNome} · Turma {d.turmaCodigo}
        </Eyebrow>
        <div className="flex items-center gap-5">
          <ProgressRing value={progresso} center={<span className="text-base">Dia {d.dia}</span>} />
          <div className="flex flex-col gap-2">
            <span className="flex items-baseline gap-2 font-display text-3xl font-extrabold">
              <span className="text-2xl">🔥</span>
              <span className="tabular-nums">{d.streak}</span>
              <span className="text-sm font-medium text-subtle">dias seguidos</span>
            </span>
            {d.feito ? (
              <Tag tone="success">Check-in feito · +{d.pontosDia}</Tag>
            ) : (
              <Tag tone="warning">Check-in pendente</Tag>
            )}
            <span className="text-xs text-subtle">
              Dia {d.dia} de {d.duracao}
              {d.faseNome ? ` · Fase ${d.faseNome}` : ""}
            </span>
          </div>
        </div>
      </header>

      {/* MISSÃO DO DIA */}
      <MissionCard pontos={d.missao.pontos} titulo={d.missao.titulo} descricao={d.missao.descricao ?? undefined} />

      {/* AÇÃO ÚNICA */}
      {d.podeOperar ? (
        <Button variante="primary" onClick={() => setSheet(true)}>
          {d.feito ? "Revisar check-in de hoje" : "Fazer check-in de hoje"}
        </Button>
      ) : (
        <Alert tone="info">A jornada ainda não começou. O check-in abre no Dia 1.</Alert>
      )}

      {/* SECUNDÁRIO — não compete com a ação */}
      <section className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard valor={`${d.indice}%`} rotulo={`Disciplina · ${d.nivel}`} />
          <StatCard valor={d.pontosTotal} rotulo="Pontos" />
        </div>
        <div className="flex gap-3">
          <ButtonLink href="/ranking" variante="ghost" fullWidth={false}>
            {d.posicao ? `Ranking · ${d.posicao}º` : "Ranking"}
          </ButtonLink>
          <ButtonLink href={`/protocolo/${d.dia}`} variante="ghost" fullWidth={false}>
            Abrir o dia no Protocolo
          </ButtonLink>
        </div>
      </section>

      {/* CHECK-IN — Bottom Sheet (prioridade sobre modal) */}
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title={`Check-in · Dia ${d.dia}`}>
        <form action={submeterCheckin} className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto pb-2">
          <input type="hidden" name="retorno" value="/dashboard" />
          <p className="mb-1 text-xs uppercase tracking-wider text-subtle">Os inegociáveis</p>
          {d.habitos.map((h) => (
            <Checkbox key={h.id} name={`habito_${h.id}`} label={h.nome} defaultChecked={d.cumpridos.includes(h.id)} />
          ))}
          <div className="my-2 h-px bg-line" />
          <Checkbox name="missao" label={`Missão: ${d.missao.titulo}`} defaultChecked={d.missaoCompleta} />
          <Toggle name="publico" label="Check-in público" defaultChecked={d.publico} />
          <Button type="submit" variante="primary" className="mt-3">
            Salvar check-in
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
}
