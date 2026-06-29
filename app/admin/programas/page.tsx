import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { togglePublicarTemporada } from "@/lib/admin/turmas";
import { listarProgramasAdmin } from "@/lib/admin/programas-data";
import { PageHeader, Aviso, td, th } from "@/components/admin/ui";
import { ProgramasResumo } from "@/components/admin/programas-ui";
import { ProgramaCard } from "@/components/admin/programa-card";
import { EmptyState } from "@/components/ui/cards";

function ToggleBtn({
  action,
  id,
  publicar,
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  publicar: boolean;
}) {
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="publicar" value={String(publicar)} />
      <button type="submit" className="text-gold hover:underline">
        {publicar ? "Publicar" : "Despublicar"}
      </button>
    </form>
  );
}

export default async function ProgramasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const sb = await createServerSupabase();
  const { data: temporadas } = await sb
    .from("temporadas")
    .select("id, nome, ano, is_publicado")
    .order("ano", { ascending: false });

  const temps = (temporadas ?? []) as {
    id: string;
    nome: string;
    ano: number;
    is_publicado: boolean;
  }[];
  const programas = await listarProgramasAdmin();

  return (
    <div>
      <PageHeader
        title="Programas"
        action={
          <Link
            href="/admin/programas/novo"
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong"
          >
            + Novo Programa
          </Link>
        }
      />
      <Aviso ok={ok} erro={erro} />

      <ProgramasResumo programas={programas} />

      {programas.length === 0 ? (
        <EmptyState titulo="Nenhum programa">
          Clique em <strong>+ Novo Programa</strong> para começar.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {programas.map((p) => (
            <ProgramaCard key={p.id} p={p} />
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-sm uppercase tracking-wider text-subtle">Temporadas</h2>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Temporada</th>
              <th className={th}>Ano</th>
              <th className={th}>Publicada</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {temps.map((t) => (
              <tr key={t.id}>
                <td className={td}>{t.nome}</td>
                <td className={td}>{t.ano}</td>
                <td className={td}>{t.is_publicado ? "sim" : "não"}</td>
                <td className={td}>
                  <ToggleBtn
                    action={togglePublicarTemporada}
                    id={t.id}
                    publicar={!t.is_publicado}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
