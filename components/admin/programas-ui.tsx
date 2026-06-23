import Link from "next/link";
import {
  criarPrograma,
  editarPrograma,
  duplicarPrograma,
  arquivarPrograma,
  desarquivarPrograma,
  excluirPrograma,
  publicarProgramaLista,
  despublicarProgramaLista,
} from "@/lib/admin/programas";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import type { ProgramaAdmin, StatusPrograma } from "@/lib/admin/programas-data";

const campo =
  "w-full rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold";
const btn =
  "rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong";
const acao =
  "rounded-lg border border-border px-2.5 py-1 text-xs text-subtle transition hover:border-gold hover:text-gold";
const acaoDanger =
  "rounded-lg border border-red-900/60 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-950/40";

// --------------------------- STATUS BADGE ----------------------------------

const STATUS_INFO: Record<StatusPrograma, { dot: string; cls: string; label: string }> = {
  rascunho: { dot: "🟡", cls: "border-amber-900/60 bg-amber-950/30 text-amber-300", label: "Rascunho" },
  publicado: {
    dot: "🟢",
    cls: "border-emerald-900/60 bg-emerald-950/40 text-emerald-300",
    label: "Publicado",
  },
  arquivado: { dot: "⚫", cls: "border-border bg-surface-raised text-subtle", label: "Arquivado" },
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

// ------------------------------- TABELA ------------------------------------

function dataCurta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function LinhaAcoes({ p }: { p: ProgramaAdmin }) {
  const arquivado = p.status === "arquivado";
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link href={`/admin/programas/${p.id}/editar`} className={acao}>
        Editar
      </Link>
      <Link href={`/admin/programas/${p.id}`} className={acao}>
        Protocolo
      </Link>

      {!arquivado &&
        (p.is_publicado ? (
          <form action={despublicarProgramaLista}>
            <input type="hidden" name="id" value={p.id} />
            <button type="submit" className={acao}>
              Despublicar
            </button>
          </form>
        ) : (
          <form action={publicarProgramaLista}>
            <input type="hidden" name="id" value={p.id} />
            <button type="submit" className={acao}>
              Publicar
            </button>
          </form>
        ))}

      <form action={duplicarPrograma}>
        <input type="hidden" name="id" value={p.id} />
        <button type="submit" className={acao}>
          Duplicar
        </button>
      </form>

      {arquivado ? (
        <form action={desarquivarPrograma}>
          <input type="hidden" name="id" value={p.id} />
          <button type="submit" className={acao}>
            Restaurar
          </button>
        </form>
      ) : (
        <form action={arquivarPrograma}>
          <input type="hidden" name="id" value={p.id} />
          <ConfirmSubmit
            message={`Arquivar "${p.nome}"? Ele sai da gestão ativa, mas o histórico é preservado.`}
            className={acao}
          >
            Arquivar
          </ConfirmSubmit>
        </form>
      )}

      <form action={excluirPrograma}>
        <input type="hidden" name="id" value={p.id} />
        <ConfirmSubmit
          message={`Excluir "${p.nome}" definitivamente? Só é possível se não houver turmas, matrículas ou acessos vinculados.`}
          className={acaoDanger}
        >
          Excluir
        </ConfirmSubmit>
      </form>
    </div>
  );
}

export function ProgramasTable({ programas }: { programas: ProgramaAdmin[] }) {
  if (!programas.length)
    return (
      <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
        Nenhum programa cadastrado. Clique em <strong>+ Novo Programa</strong> para começar.
      </p>
    );

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-raised text-left text-xs uppercase tracking-wider text-subtle">
            <th className="px-4 py-3 font-medium">Programa</th>
            <th className="px-4 py-3 font-medium">Temporada</th>
            <th className="px-4 py-3 text-center font-medium">Duração</th>
            <th className="px-4 py-3 text-center font-medium">Fases</th>
            <th className="px-4 py-3 text-center font-medium">Dias</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Atualizado</th>
            <th className="px-4 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {programas.map((p) => (
            <tr
              key={p.id}
              className={`border-t border-border align-top ${p.status === "arquivado" ? "opacity-60" : ""}`}
            >
              <td className="px-4 py-3">
                <Link
                  href={`/admin/programas/${p.id}`}
                  className="font-medium text-text transition hover:text-gold"
                >
                  {p.nome}
                </Link>
                {p.descricao ? (
                  <p className="mt-0.5 max-w-xs truncate text-xs text-subtle">{p.descricao}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted">
                {p.temporada_nome ?? "—"}
                {p.temporada_ano ? <span className="text-subtle"> ({p.temporada_ano})</span> : null}
              </td>
              <td className="px-4 py-3 text-center text-muted">{p.duracao_dias}d</td>
              <td className="px-4 py-3 text-center text-muted">{p.fases}</td>
              <td className="px-4 py-3 text-center text-muted">{p.dias}</td>
              <td className="px-4 py-3">
                <ProgramaStatusBadge status={p.status} />
              </td>
              <td className="px-4 py-3 text-subtle">{dataCurta(p.updated_at)}</td>
              <td className="px-4 py-3">
                <LinhaAcoes p={p} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
