import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, Aviso } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/cards";
import { MatriculaCard } from "@/components/admin/matricula-actions";
import { nomeDeGuerreiro } from "@/lib/identity";

const BACK = "/admin/matriculas";
const FILTROS: [string, string][] = [
  ["todos", "Todos"],
  ["ativa", "Ativas"],
  ["concluida", "Concluídas"],
  ["cancelada", "Canceladas"],
];
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

  // Query preservada (só adiciono joined_at). Filtro por status mantido.
  let query = sb
    .from("matriculas")
    .select(
      "id, status, user_id, turma_id, joined_at, users(email), turmas(codigo, programa_id, programas(nome))",
    )
    .order("joined_at", { ascending: false });
  if (status !== "todos") query = query.eq("status", status);
  const { data: matsRow } = await query;
  const mats = (matsRow ?? []) as unknown as {
    id: string;
    status: string;
    user_id: string;
    turma_id: string;
    joined_at: string | null;
    users: { email: string } | null;
    turmas: { codigo: string; programa_id: string; programas: { nome: string } | null } | null;
  }[];

  // Nome público por usuário (read-only, padrão robusto). Não usa e-mail como nome.
  const userIds = Array.from(new Set(mats.map((m) => m.user_id)));
  const { data: profRows } = userIds.length
    ? await sb.from("guerreiro_profiles").select("user_id, nome_guerreiro").in("user_id", userIds)
    : { data: [] };
  const nomePorUser = new Map(
    ((profRows ?? []) as { user_id: string; nome_guerreiro: string | null }[]).map((r) => [
      r.user_id,
      r.nome_guerreiro,
    ]),
  );

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
    <div className="flex flex-col gap-5">
      <PageHeader title="Matrículas" />
      <ButtonLink href="/admin/matriculas/nova" variante="primary">
        + Nova matrícula
      </ButtonLink>
      <Aviso ok={ok ? (OK_MSG[ok] ?? ok) : undefined} erro={erro} />

      <div className="flex flex-wrap gap-2">
        {FILTROS.map(([k, label]) => (
          <Link
            key={k}
            href={`${BACK}?status=${k}`}
            aria-current={status === k ? "page" : undefined}
            className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm transition-colors duration-fast ease-standard ${
              status === k ? "border-gold text-gold" : "border-border text-subtle hover:text-gold"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {mats.length === 0 ? (
        <EmptyState titulo="Nenhuma matrícula">
          {status === "todos"
            ? "Ainda não há matrículas. Use “Nova matrícula” para criar a primeira."
            : "Nenhuma matrícula com esse status."}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {mats.map((m) => {
            const destinos = turmas
              .filter((t) => t.programa_id === m.turmas?.programa_id && t.id !== m.turma_id)
              .map((t) => ({ id: t.id, codigo: t.codigo }));
            return (
              <MatriculaCard
                key={m.id}
                id={m.id}
                status={m.status}
                nome={nomeDeGuerreiro(nomePorUser.get(m.user_id))}
                email={m.users?.email ?? "—"}
                programa={m.turmas?.programas?.nome ?? "—"}
                turma={m.turmas?.codigo ?? "—"}
                joinedAt={m.joined_at ? new Date(m.joined_at).toLocaleDateString("pt-BR") : ""}
                destinos={destinos}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
