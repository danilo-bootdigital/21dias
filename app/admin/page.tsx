import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";

type SB = Awaited<ReturnType<typeof createServerSupabase>>;

async function countEq(sb: SB, table: string, col: string, val: string) {
  const { count } = await sb.from(table).select("id", { count: "exact", head: true }).eq(col, val);
  return count ?? 0;
}
async function countIn(sb: SB, table: string, col: string, vals: string[]) {
  const { count } = await sb.from(table).select("id", { count: "exact", head: true }).in(col, vals);
  return count ?? 0;
}

function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-3xl font-semibold text-text">{value}</p>
      <p className="mt-1 text-sm text-subtle">{label}</p>
    </div>
  );
}

export default async function AdminDashboard() {
  const sb = await createServerSupabase();

  const [mAtivas, mConcluidas, mCanceladas, entAtivos, tAndamento, tFuturas, tEncerradas] =
    await Promise.all([
      countEq(sb, "matriculas", "status", "ativa"),
      countEq(sb, "matriculas", "status", "concluida"),
      countEq(sb, "matriculas", "status", "cancelada"),
      countEq(sb, "entitlements", "status", "ativo"),
      countEq(sb, "turmas", "status", "ativa"),
      countIn(sb, "turmas", "status", ["agendada", "contagem"]),
      countIn(sb, "turmas", "status", ["encerrada", "arquivada"]),
    ]);

  const { data: ents } = await sb.from("entitlements").select("origem");
  const porOrigem: Record<string, number> = {};
  for (const e of (ents ?? []) as { origem: string }[])
    porOrigem[e.origem] = (porOrigem[e.origem] ?? 0) + 1;

  return (
    <div>
      <PageHeader title="Dashboard" />

      <h2 className="mb-2 text-sm uppercase tracking-wider text-subtle">Matrículas</h2>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card label="Ativas" value={mAtivas} />
        <Card label="Concluídas" value={mConcluidas} />
        <Card label="Canceladas" value={mCanceladas} />
      </div>

      <h2 className="mb-2 text-sm uppercase tracking-wider text-subtle">Turmas & acesso</h2>
      <div className="mb-6 grid grid-cols-4 gap-3">
        <Card label="Em andamento" value={tAndamento} />
        <Card label="Futuras" value={tFuturas} />
        <Card label="Encerradas" value={tEncerradas} />
        <Card label="Entitlements ativos" value={entAtivos} />
      </div>

      <h2 className="mb-2 text-sm uppercase tracking-wider text-subtle">Acessos por origem</h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {["compra", "cortesia", "convite", "offline", "interno", "teste"].map((o) => (
          <Card key={o} label={o} value={porOrigem[o] ?? 0} />
        ))}
      </div>
    </div>
  );
}
