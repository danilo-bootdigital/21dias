import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { Eyebrow } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/cards";

type SB = Awaited<ReturnType<typeof createServerSupabase>>;

async function countEq(sb: SB, table: string, col: string, val: string) {
  const { count } = await sb.from(table).select("id", { count: "exact", head: true }).eq(col, val);
  return count ?? 0;
}
async function countIn(sb: SB, table: string, col: string, vals: string[]) {
  const { count } = await sb.from(table).select("id", { count: "exact", head: true }).in(col, vals);
  return count ?? 0;
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
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" />

      <section className="flex flex-col gap-3">
        <Eyebrow>Matrículas</Eyebrow>
        <div className="grid grid-cols-3 gap-3">
          <StatCard valor={mAtivas} rotulo="Ativas" />
          <StatCard valor={mConcluidas} rotulo="Concluídas" />
          <StatCard valor={mCanceladas} rotulo="Canceladas" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow>Turmas & acesso</Eyebrow>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard valor={tAndamento} rotulo="Em andamento" />
          <StatCard valor={tFuturas} rotulo="Futuras" />
          <StatCard valor={tEncerradas} rotulo="Encerradas" />
          <StatCard valor={entAtivos} rotulo="Direitos de Acesso ativos" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow>Acessos por origem</Eyebrow>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {["compra", "cortesia", "convite", "offline", "interno", "teste"].map((o) => (
            <StatCard key={o} valor={porOrigem[o] ?? 0} rotulo={o} />
          ))}
        </div>
      </section>
    </div>
  );
}
