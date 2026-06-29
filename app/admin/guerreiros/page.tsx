import { PageHeader, Aviso, StatusBadge } from "@/components/admin/ui";
import { ButtonLink, Card, Tag } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/cards";
import { SearchInput } from "@/components/ui/fields";
import { listarGuerreiros } from "@/lib/admin/guerreiros-data";

/** Formata data/hora curta pt-BR; "—" quando ausente. */
function dataHora(iso: string | null): string {
  if (!iso) return "Nunca acessou";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-subtle">{rotulo}</span>
      <span className="truncate text-sm text-text">{valor}</span>
    </div>
  );
}

export default async function GuerreirosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ok?: string; erro?: string }>;
}) {
  const { q, ok, erro } = await searchParams;
  const rows = await listarGuerreiros(q);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Guerreiros" />
      <Aviso ok={ok} erro={erro} />

      <ButtonLink href="/admin/guerreiros/novo" variante="primary">
        ➕ Novo Guerreiro
      </ButtonLink>

      <form>
        <SearchInput name="q" defaultValue={q ?? ""} placeholder="Buscar por nome, cidade ou e-mail" />
      </form>

      {rows.length === 0 ? (
        <EmptyState titulo={q ? "Nenhum guerreiro encontrado" : "Nenhum guerreiro ainda"}>
          {q
            ? "Tente outro nome, cidade ou e-mail."
            : "Use ➕ Novo Guerreiro para cadastrar o primeiro."}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.userId} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-text">{r.nome}</p>
                  <p className="text-sm text-subtle">{r.cidade ?? "—"}</p>
                  <p className="break-all text-xs text-muted">{r.email}</p>
                </div>
                <Tag tone={r.ehAdmin ? "info" : "neutral"} className="shrink-0">
                  {r.ehAdmin ? "Guerreiro + Admin" : "Guerreiro"}
                </Tag>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                <Linha rotulo="Programa" valor={r.programa ?? "—"} />
                <Linha rotulo="Turma" valor={r.turma ?? "—"} />
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs uppercase tracking-wider text-subtle">Matrícula</span>
                  {r.statusMatricula ? (
                    <StatusBadge value={r.statusMatricula} />
                  ) : (
                    <span className="text-sm text-subtle">Sem matrícula</span>
                  )}
                </div>
                <Linha rotulo="Último acesso" valor={dataHora(r.ultimoAcesso)} />
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs uppercase tracking-wider text-subtle">Convite</span>
                  <Tag tone={r.conviteEnviado ? "success" : "neutral"}>
                    {r.conviteEnviado ? "Enviado" : "Não enviado"}
                  </Tag>
                </div>
              </div>

              <ButtonLink href={`/admin/guerreiros/${r.userId}`} variante="secondary">
                Editar
              </ButtonLink>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
