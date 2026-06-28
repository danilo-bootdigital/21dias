import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { ButtonLink, Card, Tag } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/cards";
import { SearchInput } from "@/components/ui/fields";
import { nomeDeGuerreiro } from "@/lib/identity";

export default async function GuerreirosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const sb = await createServerSupabase();

  // Query de busca preservada exatamente (lista + filtro client por q).
  const { data } = await sb
    .from("guerreiro_profiles")
    .select("user_id, nome_guerreiro, cidade, users(email)")
    .order("nome_guerreiro");

  let rows = (data ?? []) as unknown as {
    user_id: string;
    nome_guerreiro: string;
    cidade: string | null;
    users: { email: string } | null;
  }[];
  if (q) {
    const t = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.nome_guerreiro?.toLowerCase().includes(t) ||
        r.cidade?.toLowerCase().includes(t) ||
        r.users?.email?.toLowerCase().includes(t),
    );
  }

  // Leitura ADITIVA (read-only) para indicar acesso "Guerreiro + Admin".
  const { data: adminRows } = await sb
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .eq("scope_type", "global");
  const adminSet = new Set(((adminRows ?? []) as { user_id: string }[]).map((r) => r.user_id));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Guerreiros" />

      <form>
        <SearchInput name="q" defaultValue={q ?? ""} placeholder="Buscar por nome, cidade ou e-mail" />
      </form>

      {rows.length === 0 ? (
        <EmptyState titulo={q ? "Nenhum guerreiro encontrado" : "Nenhum guerreiro ainda"}>
          {q ? "Tente outro nome, cidade ou e-mail." : "Os guerreiros aparecerão aqui conforme entrarem na plataforma."}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((r) => {
            const ehAdmin = adminSet.has(r.user_id);
            return (
              <Card key={r.user_id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">{nomeDeGuerreiro(r.nome_guerreiro)}</p>
                    <p className="text-sm text-subtle">{r.cidade ?? "—"}</p>
                    <p className="break-all text-sm text-muted">{r.users?.email ?? "—"}</p>
                  </div>
                  <Tag tone={ehAdmin ? "info" : "neutral"} className="shrink-0">
                    {ehAdmin ? "Guerreiro + Admin" : "Guerreiro"}
                  </Tag>
                </div>

                <div className="flex flex-col gap-2">
                  <ButtonLink href={`/admin/guerreiros/${r.user_id}`} variante="secondary">
                    Ver / Editar
                  </ButtonLink>
                  <div className="grid grid-cols-2 gap-2">
                    <ButtonLink href="/admin/acesso" variante="outline">
                      Conceder Acesso
                    </ButtonLink>
                    <ButtonLink href="/admin/matriculas/nova" variante="outline">
                      Matricular
                    </ButtonLink>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
