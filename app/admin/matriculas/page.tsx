import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { formCancelar, formReativar, formTransferir } from "@/lib/admin/forms";
import { PageHeader, Aviso, StatusBadge, td, th } from "@/components/admin/ui";

const BACK = "/admin/matriculas";
const FILTROS = ["todos", "ativa", "concluida", "cancelada"];
const OK_MSG: Record<string, string> = {
  matricula_criada: "Matrícula criada com sucesso.",
};

export default async function MatriculasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ok?: string; erro?: string }>;
}) {
  const { status = "todos", ok, erro } = await searchParams;
  const sb = await createServerSupabase();

  let query = sb
    .from("matriculas")
    .select(
      "id, status, user_id, turma_id, users(email), turmas(codigo, programa_id, programas(nome))",
    )
    .order("joined_at", { ascending: false });
  if (status !== "todos") query = query.eq("status", status);
  const { data: matsRow } = await query;
  const mats = (matsRow ?? []) as unknown as {
    id: string;
    status: string;
    turma_id: string;
    users: { email: string } | null;
    turmas: { codigo: string; programa_id: string; programas: { nome: string } | null } | null;
  }[];

  const { data: turmasRow } = await sb
    .from("turmas")
    .select("id, codigo, programa_id, programas(nome)")
    .order("codigo");
  const turmas = (turmasRow ?? []) as unknown as {
    id: string;
    codigo: string;
    programa_id: string;
    programas: { nome: string } | null;
  }[];

  return (
    <div>
      <PageHeader
        title="Matrículas"
        action={
          <Link
            href="/admin/matriculas/nova"
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong"
          >
            + Nova matrícula
          </Link>
        }
      />
      <Aviso ok={ok ? (OK_MSG[ok] ?? ok) : undefined} erro={erro} />

      <div className="mb-4 flex gap-2 text-sm">
        {FILTROS.map((f) => (
          <a
            key={f}
            href={`${BACK}?status=${f}`}
            className={`rounded-full border px-3 py-1 ${
              status === f ? "border-gold text-gold" : "border-border text-subtle hover:text-gold"
            }`}
          >
            {f}
          </a>
        ))}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Guerreiro</th>
            <th className={th}>Programa / Turma</th>
            <th className={th}>Status</th>
            <th className={th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {mats.map((m) => {
            const destinos = turmas.filter(
              (t) => t.programa_id === m.turmas?.programa_id && t.id !== m.turma_id,
            );
            return (
              <tr key={m.id}>
                <td className={td}>{m.users?.email ?? "—"}</td>
                <td className={td}>
                  {m.turmas?.programas?.nome ?? "—"} / {m.turmas?.codigo ?? "—"}
                </td>
                <td className={td}>
                  <StatusBadge value={m.status} />
                </td>
                <td className={td}>
                  <div className="flex flex-wrap items-center gap-2">
                    {m.status === "ativa" ? (
                      <>
                        <form action={formCancelar}>
                          <input type="hidden" name="matriculaId" value={m.id} />
                          <input type="hidden" name="back" value={BACK} />
                          <button className="text-red-300 hover:underline">Cancelar</button>
                        </form>
                        {destinos.length ? (
                          <form action={formTransferir} className="flex items-center gap-1">
                            <input type="hidden" name="matriculaId" value={m.id} />
                            <input type="hidden" name="back" value={BACK} />
                            <select
                              name="novaTurmaId"
                              className="rounded border border-border bg-ground px-1 py-0.5 text-xs"
                            >
                              {destinos.map((t) => (
                                <option key={t.id} value={t.id}>
                                  → {t.codigo}
                                </option>
                              ))}
                            </select>
                            <button className="text-gold hover:underline">Transferir</button>
                          </form>
                        ) : null}
                      </>
                    ) : null}
                    {m.status === "cancelada" ? (
                      <form action={formReativar}>
                        <input type="hidden" name="matriculaId" value={m.id} />
                        <input type="hidden" name="back" value={BACK} />
                        <button className="text-emerald-300 hover:underline">Reativar</button>
                      </form>
                    ) : null}
                    {m.status === "concluida" ? (
                      <span className="text-xs text-subtle">—</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
          {mats.length === 0 ? (
            <tr>
              <td className={td} colSpan={4}>
                Nenhuma matrícula.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
