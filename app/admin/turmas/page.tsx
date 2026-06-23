import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, LinkBtn, td, th } from "@/components/admin/ui";

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
    <div>
      <PageHeader title="Turmas" action={<LinkBtn href="/admin/turmas/nova">Nova turma</LinkBtn>} />
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Programa</th>
            <th className={th}>Código</th>
            <th className={th}>Status</th>
            <th className={th}>Matriculados</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td className={td}>{t.programas?.nome ?? "—"}</td>
              <td className={td}>{t.codigo}</td>
              <td className={td}>
                <StatusBadge value={t.status} />
              </td>
              <td className={td}>
                {ativos[t.id] ?? 0}
                {t.tamanho_max ? ` / ${t.tamanho_max}` : ""}
              </td>
              <td className={td}>
                <Link href={`/admin/turmas/${t.id}`} className="text-gold hover:underline">
                  Editar
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td className={td} colSpan={5}>
                Nenhuma turma.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
