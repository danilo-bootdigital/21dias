import Link from "next/link";
import { notFound } from "next/navigation";
import { obterProgramaAdmin, temporadasSelect } from "@/lib/admin/programas-data";
import { PageHeader, Aviso } from "@/components/admin/ui";
import { ProgramaForm } from "@/components/admin/programas-ui";

export default async function EditarProgramaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const [programa, temporadas] = await Promise.all([obterProgramaAdmin(id), temporadasSelect()]);
  if (!programa) notFound();

  return (
    <div>
      <PageHeader
        title={`Editar — ${programa.nome}`}
        action={
          <Link
            href={`/admin/programas/${id}`}
            className="text-sm text-subtle transition hover:text-gold"
          >
            ← Voltar
          </Link>
        }
      />
      <Aviso erro={erro} />

      <ProgramaForm
        temporadas={temporadas}
        programa={{
          id: programa.id,
          nome: programa.nome,
          descricao: programa.descricao,
          duracao_dias: programa.duracao_dias,
          temporada_id: programa.temporada_id,
          is_publicado: programa.is_publicado,
          arquivado_at: programa.arquivado_at,
        }}
      />
    </div>
  );
}
