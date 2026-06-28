import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, td, th } from "@/components/admin/ui";

export default async function EntitlementsPage() {
  const sb = await createServerSupabase();
  const { data: entsRow } = await sb
    .from("entitlements")
    .select("id, email, origem, status, provider, programas(nome)")
    .order("created_at", { ascending: false });
  const ents = (entsRow ?? []) as unknown as {
    id: string;
    email: string;
    origem: string;
    status: string;
    provider: string;
    programas: { nome: string } | null;
  }[];

  const { data: matsRow } = await sb
    .from("matriculas")
    .select("entitlement_id")
    .not("entitlement_id", "is", null);
  const vinculados = new Set(
    ((matsRow ?? []) as { entitlement_id: string }[]).map((m) => m.entitlement_id),
  );

  return (
    <div>
      <PageHeader title="Auditoria de Acessos" />
      <p className="mb-4 text-sm text-subtle">
        Suporte / auditoria — direitos de acesso concedidos. A operação do dia a dia fica em
        Conceder Acesso, Guerreiros e Matrículas.
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>E-mail</th>
            <th className={th}>Programa</th>
            <th className={th}>Origem do acesso</th>
            <th className={th}>Provedor</th>
            <th className={th}>Status</th>
            <th className={th}>Matrícula vinculada</th>
          </tr>
        </thead>
        <tbody>
          {ents.map((e) => (
            <tr key={e.id}>
              <td className={td}>{e.email}</td>
              <td className={td}>{e.programas?.nome ?? "—"}</td>
              <td className={td}>{e.origem}</td>
              <td className={td}>{e.provider}</td>
              <td className={td}>
                <StatusBadge value={e.status} />
              </td>
              <td className={td}>{vinculados.has(e.id) ? "vinculada" : "—"}</td>
            </tr>
          ))}
          {ents.length === 0 ? (
            <tr>
              <td className={td} colSpan={6}>
                Nenhum entitlement.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
