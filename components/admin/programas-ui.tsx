import Link from "next/link";
import { criarPrograma, editarPrograma } from "@/lib/admin/programas";
import type { ProgramaAdmin, StatusPrograma } from "@/lib/admin/programas-data";
import { STATUS_LABEL } from "@/lib/admin/programa-status";

const campo =
  "w-full rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold";
const btn =
  "rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong";

// --------------------------- STATUS BADGE ----------------------------------

const STATUS_INFO: Record<StatusPrograma, { dot: string; cls: string; label: string }> = {
  rascunho: { dot: "🟡", cls: "border-amber-900/60 bg-amber-950/30 text-amber-300", label: STATUS_LABEL.rascunho },
  publicado: {
    dot: "🟢",
    cls: "border-emerald-900/60 bg-emerald-950/40 text-emerald-300",
    label: STATUS_LABEL.publicado,
  },
  arquivado: { dot: "⚫", cls: "border-border bg-surface-raised text-subtle", label: STATUS_LABEL.arquivado },
};

export function ProgramaStatusBadge({ status }: { status: StatusPrograma }) {
  const i = STATUS_INFO[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${i.cls}`}
    >
      <span aria-hidden>{i.dot}</span>
      {i.label}
    </span>
  );
}

// ------------------------------- FORM --------------------------------------

export function ProgramaForm({
  temporadas,
  programa,
}: {
  temporadas: { id: string; nome: string; ano: number }[];
  programa?: {
    id: string;
    nome: string;
    descricao: string | null;
    duracao_dias: number;
    temporada_id: string;
    is_publicado: boolean;
    arquivado_at: string | null;
  };
}) {
  const editar = Boolean(programa);
  const statusAtual: StatusPrograma = programa?.arquivado_at
    ? "arquivado"
    : programa?.is_publicado
      ? "publicado"
      : "rascunho";

  return (
    <form
      action={editar ? editarPrograma : criarPrograma}
      className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
    >
      {programa ? <input type="hidden" name="id" value={programa.id} /> : null}

      <label className="flex flex-col gap-1 text-sm text-muted">
        Nome do programa *
        <input
          name="nome"
          required
          defaultValue={programa?.nome ?? ""}
          placeholder="Ex.: Código 21"
          className={campo}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Descrição
        <textarea
          name="descricao"
          rows={3}
          defaultValue={programa?.descricao ?? ""}
          placeholder="Programa de desenvolvimento pessoal e disciplina."
          className={campo}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Duração (dias) *
          <input
            name="duracao_dias"
            type="number"
            min="1"
            max="400"
            required
            defaultValue={programa?.duracao_dias ?? 21}
            className={campo}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Temporada *
          <select
            name="temporada_id"
            required
            defaultValue={programa?.temporada_id ?? ""}
            className={campo}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {temporadas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} ({t.ano})
              </option>
            ))}
          </select>
        </label>
      </div>

      {statusAtual === "arquivado" ? (
        <p className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-subtle">
          Este programa está <strong>arquivado</strong>. Restaure-o na listagem para alterar a
          publicação.
        </p>
      ) : (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Status
          <select name="status" defaultValue={statusAtual} className={campo}>
            <option value="rascunho">Rascunho</option>
            <option value="publicado">Publicado</option>
          </select>
          <span className="text-xs text-subtle">
            Publicar exige que o protocolo esteja completo (sem pendências).
          </span>
        </label>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className={btn}>
          {editar ? "Salvar alterações" : "Criar programa"}
        </button>
        <Link href="/admin/programas" className="text-sm text-subtle transition hover:text-gold">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

// ----------------------------- STAT CARDS ----------------------------------

export function ProgramasResumo({ programas }: { programas: ProgramaAdmin[] }) {
  const total = programas.length;
  const publicados = programas.filter((p) => p.status === "publicado").length;
  const rascunhos = programas.filter((p) => p.status === "rascunho").length;
  const arquivados = programas.filter((p) => p.status === "arquivado").length;
  const cards: [string, number, string][] = [
    ["Total", total, "text-text"],
    ["Publicados", publicados, "text-emerald-300"],
    ["Rascunhos", rascunhos, "text-amber-300"],
    ["Arquivados", arquivados, "text-subtle"],
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(([label, valor, cor]) => (
        <div key={label} className="rounded-2xl border border-border bg-surface p-4">
          <p className={`text-2xl font-semibold ${cor}`}>{valor}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-subtle">{label}</p>
        </div>
      ))}
    </div>
  );
}
