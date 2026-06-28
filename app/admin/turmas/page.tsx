import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/cards";

const Chevron = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-subtle">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export default async function TurmasPage() {
  const sb = await createServerSupabase();
  const { data: turmas } = await sb
    .from("turmas")
    .select("id, codigo, status, starts_at, tamanho_max, programas(nome)")
    .order("codigo");
  const { data: mats } = await sb.from("matriculas").select("turma_id").eq("status", "ativa");

  const ativos: Record<string, number> = {};
  for (const m of (mats ?? []) as { turma_id: string }[])
    ativos[m.turma_id] = (ativos[m.turma_id] ?? 0) + 1;

  const rows = (turmas ?? []) as unknown as {
    id: string;
    codigo: string;
    status: string;
    starts_at: string | null;
    tamanho_max: number | null;
    programas: { nome: string } | null;
  }[];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Turmas" />
      <ButtonLink href="/admin/turmas/nova" variante="primary">
        + Nova turma
      </ButtonLink>

      {rows.length === 0 ? (
        <EmptyState titulo="Nenhuma turma">
          Use “Nova turma” para criar a primeira turma de um programa.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((t) => (
            <Link
              key={t.id}
              href={`/admin/turmas/${t.id}`}
              className="block rounded-2xl border border-border bg-surface px-4 py-4 transition-colors duration-fast ease-standard hover:border-gold"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="truncate font-medium text-text">{t.programas?.nome ?? "—"}</p>
                <div className="flex items-center gap-2">
                  <StatusBadge value={t.status} />
                  <Chevron />
                </div>
              </div>
              <p className="text-sm text-subtle">
                Turma {t.codigo}
                {t.starts_at ? ` · início ${new Date(t.starts_at).toLocaleDateString("pt-BR")}` : ""}
              </p>
              <p className="mt-1 text-sm text-muted">
                {ativos[t.id] ?? 0}
                {t.tamanho_max ? ` / ${t.tamanho_max}` : ""} matriculado
                {(ativos[t.id] ?? 0) === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
