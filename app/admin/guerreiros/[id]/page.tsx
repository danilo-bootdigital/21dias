import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, Aviso, td, th } from "@/components/admin/ui";
import { AcessoSistema } from "@/components/admin/acesso-sistema";

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

      <AcessoSistema userId={id} ehAdminInicial={ehAdmin} ehProprio={ehProprio} />

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
