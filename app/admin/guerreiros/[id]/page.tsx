import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, Aviso, td, th } from "@/components/admin/ui";
import { AcessoSistema } from "@/components/admin/acesso-sistema";
import { nomeDeGuerreiro } from "@/lib/identity";

const ORIGEM_LABEL: Record<string, string> = {
  compra: "Compra",
  cortesia: "Cortesia",
  convite: "Convite",
  offline: "Offline",
  interno: "Interno",
  teste: "Teste",
  manual: "Manual",
};

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-subtle">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-text">{valor}</dd>
    </div>
  );
}

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
    .select("id, status, joined_at, entitlement_id, turmas(codigo, programas(nome))")
    .eq("user_id", id)
    .order("joined_at", { ascending: false });
  const mats = (matsRow ?? []) as unknown as {
    id: string;
    status: string;
    entitlement_id: string | null;
    turmas: { codigo: string; programas: { nome: string } | null } | null;
  }[];

  // "Acesso ao Programa" (internamente entitlements). Lê só colunas já existentes.
  const { data: entsRow } = await sb
    .from("entitlements")
    .select("id, origem, status, created_at, granted_by, programas(nome), turmas(codigo)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });
  const ents = (entsRow ?? []) as unknown as {
    id: string;
    origem: string;
    status: string;
    created_at: string;
    granted_by: string | null;
    programas: { nome: string } | null;
    turmas: { codigo: string } | null;
  }[];

  // Quem concedeu (granted_by → nome do guerreiro) e quais acessos têm matrícula.
  const concedentes = Array.from(new Set(ents.map((e) => e.granted_by).filter(Boolean))) as string[];
  const { data: concRows } = concedentes.length
    ? await sb.from("guerreiro_profiles").select("user_id, nome_guerreiro").in("user_id", concedentes)
    : { data: [] };
  const nomeConcedente = new Map(
    ((concRows ?? []) as { user_id: string; nome_guerreiro: string }[]).map((r) => [
      r.user_id,
      nomeDeGuerreiro(r.nome_guerreiro),
    ]),
  );
  const comMatricula = new Set(mats.map((m) => m.entitlement_id).filter(Boolean));

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

      <h2 className="mb-3 text-sm uppercase tracking-wider text-subtle">Acesso ao Programa</h2>
      {ents.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-subtle">
          Nenhum direito de acesso registrado.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {ents.map((e) => (
            <div key={e.id} className="rounded-2xl border border-border bg-surface px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-medium text-text">{e.programas?.nome ?? "—"}</p>
                <StatusBadge value={e.status} />
              </div>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                <Info rotulo="Origem do acesso" valor={ORIGEM_LABEL[e.origem] ?? e.origem} />
                <Info
                  rotulo="Data da concessão"
                  valor={new Date(e.created_at).toLocaleDateString("pt-BR")}
                />
                <Info
                  rotulo="Concedido por"
                  valor={e.granted_by ? (nomeConcedente.get(e.granted_by) ?? "—") : "—"}
                />
                <Info rotulo="Turma vinculada" valor={e.turmas?.codigo ?? "—"} />
                <Info rotulo="Matrícula vinculada" valor={comMatricula.has(e.id) ? "Sim" : "Não"} />
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
