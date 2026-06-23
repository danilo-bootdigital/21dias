import { createServerSupabase } from "@/lib/supabase/server";
import { editarTurma, encerrarTurmaManual } from "@/lib/admin/turmas";
import { PageHeader, Aviso, StatusBadge, td, th } from "@/components/admin/ui";

const input =
  "rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold";
const STATUS = ["agendada", "contagem", "ativa", "encerrada", "arquivada"];

export default async function EditarTurmaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { ok, erro } = await searchParams;
  const sb = await createServerSupabase();

  const { data: turmaRow } = await sb
    .from("turmas")
    .select("id, codigo, status, timezone, starts_at, ends_at, tamanho_max, programas(nome)")
    .eq("id", id)
    .maybeSingle();
  const t = turmaRow as unknown as {
    id: string;
    codigo: string;
    status: string;
    timezone: string;
    starts_at: string | null;
    ends_at: string | null;
    tamanho_max: number | null;
    programas: { nome: string } | null;
  } | null;
  if (!t) return <p className="text-muted">Turma não encontrada.</p>;

  const { data: matsRow } = await sb
    .from("matriculas")
    .select("id, status, users(email)")
    .eq("turma_id", id)
    .order("joined_at");
  const mats = (matsRow ?? []) as unknown as {
    id: string;
    status: string;
    users: { email: string } | null;
  }[];

  return (
    <div>
      <PageHeader title={`Turma ${t.codigo} — ${t.programas?.nome ?? ""}`} />
      <Aviso ok={ok} erro={erro} />

      <form action={editarTurma} className="mb-8 grid max-w-2xl grid-cols-2 gap-3">
        <input type="hidden" name="id" value={t.id} />
        <label className="flex flex-col gap-1 text-sm text-muted">
          Código
          <input name="codigo" defaultValue={t.codigo} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Status
          <select name="status" defaultValue={t.status} className={input}>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Timezone
          <input name="timezone" defaultValue={t.timezone} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Capacidade máx.
          <input
            name="tamanho_max"
            type="number"
            min="1"
            defaultValue={t.tamanho_max ?? ""}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Início
          <input
            name="starts_at"
            type="datetime-local"
            defaultValue={t.starts_at?.slice(0, 16) ?? ""}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Fim
          <input
            name="ends_at"
            type="datetime-local"
            defaultValue={t.ends_at?.slice(0, 16) ?? ""}
            className={input}
          />
        </label>
        <button
          type="submit"
          className="col-span-2 mt-2 self-start rounded-lg bg-gold px-5 py-2 font-medium text-ground transition hover:bg-gold-strong"
        >
          Salvar turma
        </button>
      </form>

      <h2 className="mb-2 text-sm uppercase tracking-wider text-subtle">
        Matriculados ({mats.length})
      </h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Guerreiro</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {mats.map((m) => (
            <tr key={m.id}>
              <td className={td}>{m.users?.email ?? "—"}</td>
              <td className={td}>
                <StatusBadge value={m.status} />
              </td>
            </tr>
          ))}
          {mats.length === 0 ? (
            <tr>
              <td className={td} colSpan={2}>
                Sem matrículas.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <div className="mt-10 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm uppercase tracking-wider text-subtle">Encerramento</h2>
        <p className="mt-1 text-sm text-muted">
          Fallback manual: encerra a turma agora (congela disciplina, conclui matrículas, emite
          certificados/conquistas e monta o Hall). Idempotente — só age se a turma estiver{" "}
          <strong>ativa</strong>.
        </p>
        {t.status === "ativa" ? (
          <form action={encerrarTurmaManual} className="mt-3">
            <input type="hidden" name="id" value={t.id} />
            <button
              type="submit"
              className="rounded-lg border border-gold/40 px-5 py-2 font-medium text-gold transition hover:bg-gold/10"
            >
              Encerrar turma agora
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-subtle">
            Indisponível — a turma está com status <strong>{t.status}</strong>.
          </p>
        )}
      </div>
    </div>
  );
}
