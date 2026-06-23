import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, td, th } from "@/components/admin/ui";

const input =
  "rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold";

export default async function GuerreirosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const sb = await createServerSupabase();
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

  return (
    <div>
      <PageHeader title="Guerreiros" />
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome, cidade ou e-mail"
          className={`${input} w-80`}
        />
      </form>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Nome de guerreiro</th>
            <th className={th}>Cidade</th>
            <th className={th}>E-mail</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id}>
              <td className={td}>{r.nome_guerreiro}</td>
              <td className={td}>{r.cidade ?? "—"}</td>
              <td className={td}>{r.users?.email ?? "—"}</td>
              <td className={td}>
                <Link href={`/admin/guerreiros/${r.user_id}`} className="text-gold hover:underline">
                  Ver
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td className={td} colSpan={4}>
                Nenhum guerreiro.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
