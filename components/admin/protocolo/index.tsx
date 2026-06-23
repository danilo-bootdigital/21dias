import Link from "next/link";
import {
  criarFase,
  editarFase,
  excluirFase,
  reordenarFases,
  editarDia,
  criarConteudo,
  editarConteudo,
  excluirConteudo,
  reordenarConteudos,
  publicarPrograma,
  despublicarPrograma,
  clonarPrograma,
} from "@/lib/admin/protocolo";
import { td, th } from "@/components/admin/ui";
import type { Fase, DiaResumo, Conteudo } from "@/lib/admin/protocolo-data";

const campo =
  "w-full rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold";
const btn =
  "rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong";
const btnGhost =
  "rounded-lg border border-border px-3 py-1.5 text-xs text-subtle transition hover:text-gold";
const btnDanger =
  "rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-950/40";

export function SubNavProtocolo({ programaId, ativo }: { programaId: string; ativo: string }) {
  const itens: [string, string][] = [
    ["", "Visão Geral"],
    ["fases", "Fases"],
    ["dias", "Dias"],
    ["publicacao", "Publicação"],
    ["clonar", "Clonar"],
  ];
  return (
    <nav className="mb-6 flex flex-wrap gap-4 border-b border-border pb-3 text-sm">
      {itens.map(([slug, label]) => {
        const href = `/admin/programas/${programaId}${slug ? "/" + slug : ""}`;
        return (
          <Link
            key={slug}
            href={href}
            className={ativo === slug ? "text-gold" : "text-subtle transition hover:text-gold"}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LockBanner({ travado }: { travado: boolean }) {
  if (!travado) return null;
  return (
    <p className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
      🔒 Turma já iniciada — pontuação e estrutura (pontos, numeração, duração, hábitos) estão
      travadas. Você ainda pode editar textos, fases, marcos e conteúdos.
    </p>
  );
}

export function CoberturaResumo({
  total,
  comConteudo,
  semConteudo,
}: {
  total: number;
  comConteudo: number;
  semConteudo: number;
}) {
  const card = "rounded-xl border border-border bg-surface p-4 text-center";
  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      <div className={card}>
        <p className="text-2xl font-semibold text-text">{total}</p>
        <p className="mt-1 text-xs text-subtle">Dias</p>
      </div>
      <div className={card}>
        <p className="text-2xl font-semibold text-emerald-300">{comConteudo}</p>
        <p className="mt-1 text-xs text-subtle">Com conteúdo</p>
      </div>
      <div className={card}>
        <p
          className={`text-2xl font-semibold ${semConteudo > 0 ? "text-red-300" : "text-emerald-300"}`}
        >
          {semConteudo}
        </p>
        <p className="mt-1 text-xs text-subtle">Sem conteúdo</p>
      </div>
    </div>
  );
}

export function FaseForm({ programaId }: { programaId: string }) {
  return (
    <form
      action={criarFase}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <input type="hidden" name="programa_id" value={programaId} />
      <label className="flex flex-col gap-1 text-sm text-muted">
        Nome
        <input name="nome" required className={campo} />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
        Descrição
        <input name="descricao" className={campo} />
      </label>
      <button type="submit" className={btn}>
        Adicionar fase
      </button>
    </form>
  );
}

export function FaseList({ programaId, fases }: { programaId: string; fases: Fase[] }) {
  if (!fases.length) return <p className="text-muted">Nenhuma fase cadastrada.</p>;
  return (
    <div className="flex flex-col gap-3">
      {fases.map((f) => (
        <div key={f.id} className="rounded-xl border border-border bg-surface p-4">
          <form action={editarFase} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={f.id} />
            <input type="hidden" name="programa_id" value={programaId} />
            <span className="self-center rounded-full border border-border px-2 py-0.5 text-xs text-subtle">
              #{f.ordem}
            </span>
            <label className="flex flex-col gap-1 text-sm text-muted">
              Nome
              <input name="nome" defaultValue={f.nome} className={campo} />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
              Descrição
              <input name="descricao" defaultValue={f.descricao ?? ""} className={campo} />
            </label>
            <button type="submit" className={btnGhost}>
              Salvar
            </button>
          </form>
          <div className="mt-2 flex gap-2">
            <form action={reordenarFases}>
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="programa_id" value={programaId} />
              <input type="hidden" name="direcao" value="cima" />
              <button className={btnGhost}>↑ subir</button>
            </form>
            <form action={reordenarFases}>
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="programa_id" value={programaId} />
              <input type="hidden" name="direcao" value="baixo" />
              <button className={btnGhost}>↓ descer</button>
            </form>
            <form action={excluirFase}>
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="programa_id" value={programaId} />
              <button className={btnDanger}>Excluir</button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DiaList({ programaId, dias }: { programaId: string; dias: DiaResumo[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={th}>#</th>
          <th className={th}>Fase</th>
          <th className={th}>Missão</th>
          <th className={th}>Conteúdos</th>
          <th className={th}>Marco</th>
          <th className={th}></th>
        </tr>
      </thead>
      <tbody>
        {dias.map((d) => (
          <tr key={d.id}>
            <td className={td}>{d.numero}</td>
            <td className={td}>{d.fase_nome ?? "—"}</td>
            <td className={td}>{d.missao_titulo}</td>
            <td className={td}>
              {d.conteudos === 0 ? <span className="text-red-300">0</span> : d.conteudos}
            </td>
            <td className={td}>{d.eh_marco ? "★" : ""}</td>
            <td className={td}>
              <Link
                href={`/admin/programas/${programaId}/dias/${d.numero}`}
                className="text-gold hover:underline"
              >
                Editar
              </Link>
            </td>
          </tr>
        ))}
        {dias.length === 0 ? (
          <tr>
            <td className={td} colSpan={6}>
              Nenhum dia cadastrado.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

export function MarcoFields({
  ehMarco,
  marcoTitulo,
  marcoDescricao,
}: {
  ehMarco: boolean;
  marcoTitulo: string | null;
  marcoDescricao: string | null;
}) {
  return (
    <fieldset className="rounded-xl border border-border bg-surface p-4">
      <legend className="px-1 text-xs uppercase tracking-wider text-subtle">Marco</legend>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="eh_marco" defaultChecked={ehMarco} /> Este dia é um marco
      </label>
      <label className="mt-2 flex flex-col gap-1 text-sm text-muted">
        Título do marco
        <input name="marco_titulo" defaultValue={marcoTitulo ?? ""} className={campo} />
      </label>
      <label className="mt-2 flex flex-col gap-1 text-sm text-muted">
        Descrição do marco
        <textarea
          name="marco_descricao"
          defaultValue={marcoDescricao ?? ""}
          rows={2}
          className={campo}
        />
      </label>
    </fieldset>
  );
}

export function DiaForm({
  programaId,
  dia,
  fases,
  travado,
}: {
  programaId: string;
  dia: {
    id: string;
    numero: number;
    fase_id: string;
    missao_titulo: string;
    missao_descricao: string | null;
    missao_pontos: number;
    titulo: string | null;
    instrucoes: string | null;
    eh_marco: boolean;
    marco_titulo: string | null;
    marco_descricao: string | null;
  };
  fases: Fase[];
  travado: boolean;
}) {
  return (
    <form action={editarDia} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={dia.id} />
      <input type="hidden" name="programa_id" value={programaId} />
      <input type="hidden" name="numero" value={dia.numero} />
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Título do dia
          <input name="titulo" defaultValue={dia.titulo ?? ""} className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Fase
          <select name="fase_id" defaultValue={dia.fase_id} className={campo}>
            {fases.map((f) => (
              <option key={f.id} value={f.id}>
                {f.ordem}. {f.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Instruções
        <textarea
          name="instrucoes"
          defaultValue={dia.instrucoes ?? ""}
          rows={3}
          className={campo}
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Missão — título
          <input name="missao_titulo" defaultValue={dia.missao_titulo} className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Missão — pontos
          <input
            name="missao_pontos"
            type="number"
            min="0"
            defaultValue={dia.missao_pontos}
            disabled={travado}
            className={`${campo} ${travado ? "opacity-50" : ""}`}
          />
          {travado ? (
            <span className="text-xs text-amber-300">Travado (turma iniciada)</span>
          ) : null}
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Missão — descrição
        <textarea
          name="missao_descricao"
          defaultValue={dia.missao_descricao ?? ""}
          rows={2}
          className={campo}
        />
      </label>
      <MarcoFields
        ehMarco={dia.eh_marco}
        marcoTitulo={dia.marco_titulo}
        marcoDescricao={dia.marco_descricao}
      />
      <button type="submit" className={`${btn} self-start`}>
        Salvar dia
      </button>
    </form>
  );
}

export function ConteudoForm({
  programaId,
  diaId,
  numero,
}: {
  programaId: string;
  diaId: string;
  numero: number;
}) {
  return (
    <form
      action={criarConteudo}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <input type="hidden" name="programa_id" value={programaId} />
      <input type="hidden" name="dia_id" value={diaId} />
      <input type="hidden" name="numero" value={numero} />
      <label className="flex flex-col gap-1 text-sm text-muted">
        Tipo
        <select name="tipo" className={campo}>
          <option value="texto">Texto</option>
          <option value="link">Link</option>
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
        Título (opcional)
        <input name="titulo" className={campo} />
      </label>
      <label className="flex w-full flex-col gap-1 text-sm text-muted">
        Conteúdo (texto/markdown ou URL)
        <textarea name="corpo" rows={2} required className={campo} />
      </label>
      <button type="submit" className={btn}>
        Adicionar conteúdo
      </button>
    </form>
  );
}

export function ConteudoList({
  programaId,
  diaId,
  numero,
  conteudos,
}: {
  programaId: string;
  diaId: string;
  numero: number;
  conteudos: Conteudo[];
}) {
  if (!conteudos.length) return <p className="text-muted">Nenhum conteúdo neste dia.</p>;
  return (
    <div className="flex flex-col gap-3">
      {conteudos.map((c) => (
        <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
          <form action={editarConteudo} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="programa_id" value={programaId} />
            <input type="hidden" name="numero" value={numero} />
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-subtle">
                #{c.ordem}
              </span>
              <select
                name="tipo"
                defaultValue={c.tipo}
                className="rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold"
              >
                <option value="texto">Texto</option>
                <option value="link">Link</option>
              </select>
              <input
                name="titulo"
                defaultValue={c.titulo ?? ""}
                placeholder="Título"
                className={`${campo} flex-1`}
              />
            </div>
            <textarea name="corpo" defaultValue={c.corpo} rows={2} className={campo} />
            <button type="submit" className={`${btnGhost} self-start`}>
              Salvar conteúdo
            </button>
          </form>
          <div className="mt-2 flex gap-2">
            <form action={reordenarConteudos}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="dia_id" value={diaId} />
              <input type="hidden" name="programa_id" value={programaId} />
              <input type="hidden" name="numero" value={numero} />
              <input type="hidden" name="direcao" value="cima" />
              <button className={btnGhost}>↑ subir</button>
            </form>
            <form action={reordenarConteudos}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="dia_id" value={diaId} />
              <input type="hidden" name="programa_id" value={programaId} />
              <input type="hidden" name="numero" value={numero} />
              <input type="hidden" name="direcao" value="baixo" />
              <button className={btnGhost}>↓ descer</button>
            </form>
            <form action={excluirConteudo}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="programa_id" value={programaId} />
              <input type="hidden" name="numero" value={numero} />
              <button className={btnDanger}>Excluir</button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}

// ----------------------------- PUBLICAÇÃO (C3) -----------------------------

const REGRAS_PUBLICACAO: { label: string; marcador: string }[] = [
  { label: "Quantidade de dias igual à duração", marcador: "diferente de duracao_dias" },
  { label: "Numeração contígua (1..duração)", marcador: "Numeracao de dias incompleta" },
  { label: "Todos os dias com fase atribuída", marcador: "Dias sem fase atribuida" },
  { label: "Todas as missões configuradas", marcador: "Dias sem missao configurada" },
  { label: "Pelo menos uma fase cadastrada", marcador: "Programa sem fases" },
  { label: "Todo dia com pelo menos 1 conteúdo", marcador: "Dias sem conteudo" },
];

export function PendenciasPanel({ pendencias }: { pendencias: string[] }) {
  if (pendencias.length === 0) {
    return (
      <p className="mb-6 rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
        ✅ Pronto para publicar — nenhuma pendência.
      </p>
    );
  }
  return (
    <div className="mb-6 rounded-xl border border-red-900/50 bg-red-950/30 p-4">
      <p className="mb-2 text-sm font-medium text-red-300">
        {pendencias.length} pendência(s) bloqueando a publicação:
      </p>
      <ul className="list-disc pl-5 text-sm text-red-200">
        {pendencias.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

export function ChecklistPublicacao({ pendencias }: { pendencias: string[] }) {
  const temPendencia = (marcador: string) => pendencias.some((p) => p.includes(marcador));
  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm uppercase tracking-wider text-subtle">Regras obrigatórias</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {REGRAS_PUBLICACAO.map((r) => {
          const ok = !temPendencia(r.marcador);
          return (
            <li key={r.marcador} className="flex items-center gap-2">
              <span className={ok ? "text-emerald-300" : "text-red-300"}>{ok ? "✅" : "❌"}</span>
              <span className={ok ? "text-muted" : "text-text"}>{r.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PublicarControls({
  programaId,
  isPublicado,
  podePublicar,
  turmaIniciada,
}: {
  programaId: string;
  isPublicado: boolean;
  podePublicar: boolean;
  turmaIniciada: boolean;
}) {
  if (!isPublicado) {
    return (
      <div>
        <form action={publicarPrograma}>
          <input type="hidden" name="programa_id" value={programaId} />
          <button
            type="submit"
            disabled={!podePublicar}
            className={`rounded-lg bg-gold px-5 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong ${
              !podePublicar ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            Publicar programa
          </button>
        </form>
        {!podePublicar ? (
          <p className="mt-2 text-xs text-subtle">
            Resolva as pendências acima para habilitar a publicação.
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div>
      <form action={despublicarPrograma}>
        <input type="hidden" name="programa_id" value={programaId} />
        <button
          type="submit"
          disabled={turmaIniciada}
          className={`rounded-lg border border-border px-5 py-2 text-sm text-subtle transition hover:text-gold ${
            turmaIniciada ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          Despublicar programa
        </button>
      </form>
      {turmaIniciada ? (
        <p className="mt-2 text-xs text-amber-300">
          Programa com turma iniciada (histórico de execução) não pode ser despublicado.
        </p>
      ) : null}
    </div>
  );
}

// ------------------------------ CLONAGEM (C4) ------------------------------

export function ClonarForm({
  programaId,
  isPublicado,
}: {
  programaId: string;
  isPublicado: boolean;
}) {
  if (!isPublicado) {
    return (
      <p className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
        Só programas <strong>publicados</strong> podem ser clonados. Publique este programa antes de
        duplicá-lo.
      </p>
    );
  }
  return (
    <form
      action={clonarPrograma}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <input type="hidden" name="origem_id" value={programaId} />
      <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
        Nome do novo programa
        <input name="nome" required placeholder="Ex.: Código 42" className={campo} />
      </label>
      <button type="submit" className={btn}>
        Duplicar programa
      </button>
    </form>
  );
}
