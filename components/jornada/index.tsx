import Link from "next/link";
import { submeterCheckin } from "@/lib/jornada/checkin";

export function IndicadoresHeader({
  streak,
  indice,
  pontos,
  nivel,
}: {
  streak: number;
  indice: number;
  pontos: number;
  nivel: string;
}) {
  const card = "rounded-xl border border-border bg-surface p-4 text-center";
  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      <div className={card}>
        <p className="text-3xl font-semibold text-gold">🔥 {streak}</p>
        <p className="mt-1 text-sm text-subtle">Presença (dias)</p>
      </div>
      <div className={card}>
        <p className="text-3xl font-semibold text-text">{indice}%</p>
        <p className="mt-1 text-sm text-subtle">Disciplina</p>
      </div>
      <div className={card}>
        <p className="text-3xl font-semibold text-text">{pontos}</p>
        <p className="mt-1 text-sm text-subtle">Execução · {nivel}</p>
      </div>
    </div>
  );
}

export function MissaoCard({
  titulo,
  descricao,
  pontos,
}: {
  titulo: string;
  descricao?: string | null;
  pontos: number;
}) {
  return (
    <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
      <p className="text-xs uppercase tracking-wider text-gold">Missão do dia · +{pontos}</p>
      <p className="mt-1 font-medium text-text">{titulo}</p>
      {descricao ? <p className="mt-1 text-sm text-muted">{descricao}</p> : null}
    </div>
  );
}

export function CheckinForm({
  dia,
  podeOperar,
  habitos,
  cumpridos,
  missaoTitulo,
  missaoCompleta,
  publico,
  retorno = "/dashboard",
}: {
  dia: number;
  podeOperar: boolean;
  habitos: { id: string; nome: string }[];
  cumpridos: string[];
  missaoTitulo: string;
  missaoCompleta: boolean;
  publico: boolean;
  retorno?: string;
}) {
  if (!podeOperar) {
    return (
      <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-subtle">
        Check-in indisponível — sem jornada ativa no dia corrente.
      </p>
    );
  }
  return (
    <form action={submeterCheckin} className="flex flex-col gap-2">
      <input type="hidden" name="retorno" value={retorno} />
      <p className="text-sm text-subtle">Check-in do dia {dia}</p>
      {habitos.map((h) => (
        <label key={h.id} className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            name={`habito_${h.id}`}
            defaultChecked={cumpridos.includes(h.id)}
          />
          {h.nome}
        </label>
      ))}
      <label className="mt-1 flex items-center gap-2 text-sm text-gold">
        <input type="checkbox" name="missao" defaultChecked={missaoCompleta} />
        Missão: {missaoTitulo}
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="publico" defaultChecked={publico} />
        Check-in público
      </label>
      <button
        type="submit"
        className="mt-2 self-start rounded-lg bg-gold px-5 py-2 font-medium text-ground transition hover:bg-gold-strong"
      >
        Salvar check-in
      </button>
    </form>
  );
}

export function RankingTabs({
  tab,
  rows,
  metricaLabel,
}: {
  tab: string;
  rows: { posicao: number; valor: number; ehVoce: boolean }[];
  metricaLabel: string;
}) {
  const tabs: [string, string][] = [
    ["geral", "Geral"],
    ["semanal", "Semanal"],
    ["presenca", "Presença"],
  ];
  return (
    <div>
      <div className="mb-4 flex gap-2 text-sm">
        {tabs.map(([k, label]) => (
          <Link
            key={k}
            href={`/ranking?tab=${k}`}
            className={`rounded-full border px-3 py-1 ${
              tab === k ? "border-gold text-gold" : "border-border text-subtle hover:text-gold"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border-b border-border px-3 py-2 text-left text-xs uppercase text-subtle">
              #
            </th>
            <th className="border-b border-border px-3 py-2 text-left text-xs uppercase text-subtle">
              {metricaLabel}
            </th>
            <th className="border-b border-border px-3 py-2 text-left text-xs uppercase text-subtle"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={r.ehVoce ? "text-gold" : ""}>
              <td className="border-b border-border px-3 py-2 text-sm">{r.posicao}</td>
              <td className="border-b border-border px-3 py-2 text-sm">{r.valor}</td>
              <td className="border-b border-border px-3 py-2 text-sm">{r.ehVoce ? "você" : ""}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-2 text-sm text-subtle" colSpan={3}>
                Sem dados de ranking.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function CertificadoView({
  programa,
  turma,
  nivel,
  disciplina,
  emitidoEm,
}: {
  programa: string;
  turma: string;
  nivel: string;
  disciplina: number;
  emitidoEm: string;
}) {
  return (
    <div className="rounded-2xl border border-gold/40 bg-surface p-8 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Certificado</p>
      <h2 className="mt-3 font-display text-3xl font-semibold">{programa}</h2>
      <p className="mt-1 text-muted">Turma {turma}</p>
      <div className="mt-6 flex justify-center gap-8">
        <div>
          <p className="text-2xl font-semibold text-gold">{nivel}</p>
          <p className="text-xs text-subtle">Nível final</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-text">{disciplina}%</p>
          <p className="text-xs text-subtle">Disciplina final</p>
        </div>
      </div>
      <p className="mt-6 text-xs text-subtle">Emitido em {emitidoEm}</p>
    </div>
  );
}

export function HallList({
  entries,
}: {
  entries: { posicao: number; nivel: string | null; disciplina: number | null; ehVoce: boolean }[];
}) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="border-b border-border px-3 py-2 text-left text-xs uppercase text-subtle">
            #
          </th>
          <th className="border-b border-border px-3 py-2 text-left text-xs uppercase text-subtle">
            Nível
          </th>
          <th className="border-b border-border px-3 py-2 text-left text-xs uppercase text-subtle">
            Disciplina
          </th>
          <th className="border-b border-border px-3 py-2 text-left text-xs uppercase text-subtle"></th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={i} className={e.ehVoce ? "text-gold" : ""}>
            <td className="border-b border-border px-3 py-2 text-sm">{e.posicao}</td>
            <td className="border-b border-border px-3 py-2 text-sm">{e.nivel ?? "—"}</td>
            <td className="border-b border-border px-3 py-2 text-sm">{e.disciplina ?? "—"}%</td>
            <td className="border-b border-border px-3 py-2 text-sm">{e.ehVoce ? "você" : ""}</td>
          </tr>
        ))}
        {entries.length === 0 ? (
          <tr>
            <td className="px-3 py-2 text-sm text-subtle" colSpan={4}>
              Hall ainda não disponível.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

// --------------------------- PROTOCOLO (FASE D) ----------------------------

const PROTO_STATUS: Record<string, { label: string; cls: string; icon: string }> = {
  bloqueado: { label: "Bloqueado", cls: "border-border text-subtle", icon: "🔒" },
  hoje: { label: "Hoje", cls: "border-gold/40 text-gold", icon: "▶" },
  concluido: { label: "Concluído", cls: "border-emerald-900/60 text-emerald-300", icon: "✅" },
  perdido: { label: "Perdido", cls: "border-red-900/60 text-red-300", icon: "⚠️" },
};

export function ProtocoloTimeline({
  dias,
}: {
  dias: {
    numero: number;
    fase: string | null;
    titulo: string | null;
    missaoTitulo: string;
    ehMarco: boolean;
    status: string;
  }[];
}) {
  if (!dias.length) return <p className="text-muted">Protocolo ainda não disponível.</p>;
  return (
    <ol className="flex flex-col gap-2">
      {dias.map((d) => {
        const info = PROTO_STATUS[d.status] ?? PROTO_STATUS.bloqueado;
        const interno = (
          <div
            className={`flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 ${info.cls}`}
          >
            <span className="w-6 text-center">{info.icon}</span>
            <span className="w-16 text-sm text-subtle">Dia {d.numero}</span>
            <div className="flex-1">
              <p className="text-sm text-text">
                {d.titulo ?? d.missaoTitulo}
                {d.ehMarco ? " ★" : ""}
              </p>
              <p className="text-xs text-subtle">{d.fase ?? "—"}</p>
            </div>
            <span className="text-xs">{info.label}</span>
          </div>
        );
        return (
          <li key={d.numero}>
            {d.status === "bloqueado" ? (
              <div className="opacity-60">{interno}</div>
            ) : (
              <Link href={`/protocolo/${d.numero}`} className="block transition hover:opacity-90">
                {interno}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function DiaConteudoBloco({
  tipo,
  titulo,
  corpo,
}: {
  tipo: string;
  titulo: string | null;
  corpo: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      {titulo ? <p className="mb-1 font-medium text-text">{titulo}</p> : null}
      {tipo === "link" ? (
        <a
          href={corpo}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-gold hover:underline"
        >
          {corpo}
        </a>
      ) : (
        <p className="whitespace-pre-line text-sm text-muted">{corpo}</p>
      )}
    </div>
  );
}

export function DiaProtocoloView({
  titulo,
  instrucoes,
  missaoTitulo,
  missaoDescricao,
  missaoPontos,
  ehMarco,
  marcoTitulo,
  marcoDescricao,
  conteudos,
}: {
  titulo: string | null;
  instrucoes: string | null;
  missaoTitulo: string;
  missaoDescricao: string | null;
  missaoPontos: number;
  ehMarco: boolean;
  marcoTitulo: string | null;
  marcoDescricao: string | null;
  conteudos: { tipo: string; titulo: string | null; corpo: string }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {ehMarco && marcoTitulo ? (
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
          <p className="text-xs uppercase tracking-wider text-gold">Marco</p>
          <p className="mt-1 font-medium text-text">{marcoTitulo}</p>
          {marcoDescricao ? <p className="mt-1 text-sm text-muted">{marcoDescricao}</p> : null}
        </div>
      ) : null}
      {titulo ? <h2 className="font-display text-xl font-semibold">{titulo}</h2> : null}
      {instrucoes ? <p className="whitespace-pre-line text-muted">{instrucoes}</p> : null}
      <MissaoCard titulo={missaoTitulo} descricao={missaoDescricao} pontos={missaoPontos} />
      {conteudos.length ? (
        <div className="flex flex-col gap-3">
          {conteudos.map((c, i) => (
            <DiaConteudoBloco key={i} tipo={c.tipo} titulo={c.titulo} corpo={c.corpo} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
