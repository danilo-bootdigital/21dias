import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, Aviso, td, th } from "@/components/admin/ui";
import { definirPerfilAcesso } from "@/lib/admin/roles";

const selectCls =
  "rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold";

export default async function GuerreiroDetalhe({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id } = await params; // = users.id
  const { ok, erro } = await searchParams;
  const sb = await createServerSupabase();

  const { data: perfilRow } = await sb
    .from("guerreiro_profiles")
    .select("nome_guerreiro, cidade, bio, users(email)")
    .eq("user_id", id)
    .maybeSingle();
  const perfil = perfilRow as unknown as {
    nome_guerreiro: string;
    cidade: string | null;
    bio: string | null;
    users: { email: string } | null;
  } | null;

  const { data: matsRow } = await sb
    .from("matriculas")
    .select("id, status, joined_at, turmas(codigo, programas(nome))")
    .eq("user_id", id)
    .order("joined_at", { ascending: false });
  const mats = (matsRow ?? []) as unknown as {
    id: string;
    status: string;
    turmas: { codigo: string; programas: { nome: string } | null } | null;
  }[];

  const { data: entsRow } = await sb
    .from("entitlements")
    .select("id, origem, status, provider, programas(nome)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });
  const ents = (entsRow ?? []) as unknown as {
    id: string;
    origem: string;
    status: string;
    provider: string;
    programas: { nome: string } | null;
  }[];

  // Perfil de acesso atual: role global `admin` => Guerreiro + Administrador.
  const { data: adminRoleRow } = await sb
    .from("user_roles")
    .select("id")
    .eq("user_id", id)
    .eq("role", "admin")
    .eq("scope_type", "global")
    .limit(1)
    .maybeSingle();
  const ehAdmin = Boolean(adminRoleRow);

  // É o próprio admin logado? (não pode remover o próprio acesso)
  const {
    data: { user: authUser },
  } = await sb.auth.getUser();
  const { data: meRow } = authUser
    ? await sb.from("users").select("id").eq("auth_user_id", authUser.id).maybeSingle()
    : { data: null };
  const ehProprio = (meRow as { id: string } | null)?.id === id;

  return (
    <div>
      <PageHeader title={perfil?.nome_guerreiro ?? "Guerreiro"} />
      <Aviso ok={ok} erro={erro} />
      <p className="mb-6 text-sm text-muted">
        {perfil?.users?.email ?? "—"} · {perfil?.cidade ?? "sem cidade"}
      </p>

      <section className="mb-8 rounded-2xl border border-border bg-surface-raised px-4 py-4">
        <h2 className="mb-1 text-sm uppercase tracking-wider text-subtle">Perfil de acesso</h2>
        <p className="mb-3 text-xs text-subtle">
          Todo administrador também é guerreiro. Guerreiro + Administrador libera os menus e rotas
          administrativas.
        </p>
        <form action={definirPerfilAcesso} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="user_id" value={id} />
          <label className="flex flex-col gap-1 text-sm text-muted">
            Perfil
            <select
              name="perfil"
              defaultValue={ehAdmin ? "administrador" : "guerreiro"}
              className={selectCls}
            >
              <option value="guerreiro">Guerreiro</option>
              <option value="administrador">Guerreiro + Administrador</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-gold px-5 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong"
          >
            Salvar perfil
          </button>
        </form>
        {ehProprio ? (
          <p className="mt-2 text-xs text-amber-300">
            Este é o seu próprio usuário — você não pode remover o seu acesso de administrador.
          </p>
        ) : null}
      </section>

      <h2 className="mb-2 text-sm uppercase tracking-wider text-subtle">
        Matrículas / histórico de acesso
      </h2>
      <table className="mb-8 w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Programa</th>
            <th className={th}>Turma</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {mats.map((m) => (
            <tr key={m.id}>
              <td className={td}>{m.turmas?.programas?.nome ?? "—"}</td>
              <td className={td}>{m.turmas?.codigo ?? "—"}</td>
              <td className={td}>
                <StatusBadge value={m.status} />
              </td>
            </tr>
          ))}
          {mats.length === 0 ? (
            <tr>
              <td className={td} colSpan={3}>
                Sem matrículas.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <h2 className="mb-2 text-sm uppercase tracking-wider text-subtle">Entitlements</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Programa</th>
            <th className={th}>Origem</th>
            <th className={th}>Provider</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {ents.map((e) => (
            <tr key={e.id}>
              <td className={td}>{e.programas?.nome ?? "—"}</td>
              <td className={td}>{e.origem}</td>
              <td className={td}>{e.provider}</td>
              <td className={td}>
                <StatusBadge value={e.status} />
              </td>
            </tr>
          ))}
          {ents.length === 0 ? (
            <tr>
              <td className={td} colSpan={4}>
                Sem entitlements.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
