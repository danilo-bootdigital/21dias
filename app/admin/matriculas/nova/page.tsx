import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { criarMatriculaManual } from "@/lib/admin/matriculas";
import { PageHeader, Aviso } from "@/components/admin/ui";

const input =
  "w-full rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold";

const STATUS_TURMA_BLOQUEADOS = new Set(["encerrada", "arquivada"]);

export default async function NovaMatriculaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const sb = await createServerSupabase();

  const { data: usersRow } = await sb
    .from("users")
    .select("id, email, guerreiro_profiles(nome_guerreiro)")
    .order("email");
  const users = (usersRow ?? []) as unknown as {
    id: string;
    email: string;
    guerreiro_profiles: { nome_guerreiro: string | null } | null;
  }[];

  const { data: turmasRow } = await sb
    .from("turmas")
    .select("id, codigo, status, programas(nome)")
    .order("codigo");
  const turmas = (
    (turmasRow ?? []) as unknown as {
      id: string;
      codigo: string;
      status: string;
      programas: { nome: string } | null;
    }[]
  ).filter((t) => !STATUS_TURMA_BLOQUEADOS.has(t.status));

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Nova matrícula"
        action={
          <Link href="/admin/matriculas" className="text-sm text-subtle transition hover:text-gold">
            ← Voltar
          </Link>
        }
      />
      <Aviso erro={erro} />

      {users.length === 0 || turmas.length === 0 ? (
        <p className="rounded-2xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          {users.length === 0
            ? "Nenhum guerreiro cadastrado."
            : "Nenhuma turma disponível para matrícula (apenas turmas encerradas/arquivadas)."}
        </p>
      ) : (
        <form action={criarMatriculaManual} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-muted">
            Guerreiro
            <select name="user_id" required defaultValue="" className={input}>
              <option value="" disabled>
                Selecione…
              </option>
              {users.map((u) => {
                const nome = u.guerreiro_profiles?.nome_guerreiro;
                return (
                  <option key={u.id} value={u.id}>
                    {nome ? `${nome} — ${u.email}` : u.email}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-muted">
            Turma
            <select name="turma_id" required defaultValue="" className={input}>
              <option value="" disabled>
                Selecione…
              </option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.programas?.nome ?? "—"} / {t.codigo} ({t.status})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-muted">
            Status inicial
            <select name="status" defaultValue="ativa" className={input}>
              <option value="ativa">Ativa</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
            <span className="text-xs text-subtle">
              Matrícula ativa libera o acesso do guerreiro ao /dashboard.
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-gold px-5 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong"
            >
              Criar matrícula
            </button>
            <Link
              href="/admin/matriculas"
              className="text-sm text-subtle transition hover:text-gold"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
