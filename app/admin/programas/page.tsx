import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { togglePublicarPrograma, togglePublicarTemporada } from "@/lib/admin/turmas";
import { PageHeader, StatusBadge, td, th } from "@/components/admin/ui";

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

export default async function ProgramasPage() {
  const sb = await createServerSupabase();
  const { data: temporadas } = await sb
    .from("temporadas")
    .select("id, nome, ano, is_publicado")
    .order("ano", { ascending: false });
  const { data: programas } = await sb
    .from("programas")
    .select("id, nome, duracao_dias, is_publicado, temporada_id")
    .order("nome");

  const temps = (temporadas ?? []) as {
    id: string;
    nome: string;
    ano: number;
    is_publicado: boolean;
  }[];
  const progs = (programas ?? []) as {
    id: string;
    nome: string;
    duracao_dias: number;
    is_publicado: boolean;
    temporada_id: string;
  }[];

  return (
    <div>
      <PageHeader title="Programas (leitura + publicação)" />

      <h2 className="mb-2 text-sm uppercase tracking-wider text-subtle">Temporadas</h2>
      <table className="mb-8 w-full border-collapse">
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
                <ToggleBtn action={togglePublicarTemporada} id={t.id} publicar={!t.is_publicado} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 text-sm uppercase tracking-wider text-subtle">Programas</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Programa</th>
            <th className={th}>Duração</th>
            <th className={th}>Publicado</th>
            <th className={th}>Protocolo</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {progs.map((p) => (
            <tr key={p.id}>
              <td className={td}>{p.nome}</td>
              <td className={td}>{p.duracao_dias} dias</td>
              <td className={td}>
                <StatusBadge value={p.is_publicado ? "publicado" : "rascunho"} />
              </td>
              <td className={td}>
                <Link href={`/admin/programas/${p.id}`} className="text-gold hover:underline">
                  Gerenciar
                </Link>
              </td>
              <td className={td}>
                <ToggleBtn action={togglePublicarPrograma} id={p.id} publicar={!p.is_publicado} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
