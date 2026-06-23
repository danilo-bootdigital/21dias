import { notFound } from "next/navigation";
import {
  obterPrograma,
  listarFases,
  coberturaConteudo,
  turmaIniciada,
} from "@/lib/admin/protocolo-data";
import { PageHeader, Aviso, StatusBadge, LinkBtn } from "@/components/admin/ui";
import { SubNavProtocolo, LockBanner, CoberturaResumo } from "@/components/admin/protocolo";

export default async function VisaoGeralPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { ok, erro } = await searchParams;
  const programa = await obterPrograma(id);
  if (!programa) notFound();

  const [fases, cobertura, travado] = await Promise.all([
    listarFases(id),
    coberturaConteudo(id),
    turmaIniciada(id),
  ]);

  return (
    <div>
      <PageHeader
        title={programa.nome}
        action={<StatusBadge value={programa.is_publicado ? "publicado" : "rascunho"} />}
      />
      <SubNavProtocolo programaId={id} ativo="" />
      <Aviso ok={ok ? "Operação concluída." : undefined} erro={erro} />
      <LockBanner travado={travado} />

      <p className="mb-6 text-sm text-subtle">
        Duração: {programa.duracao_dias} dias · {fases.length} fase(s) ·{" "}
        {programa.is_publicado ? "publicado" : "rascunho"}
      </p>

      <CoberturaResumo
        total={cobertura.total}
        comConteudo={cobertura.comConteudo}
        semConteudo={cobertura.semConteudo}
      />

      <div className="flex flex-wrap gap-3">
        <LinkBtn href={`/admin/programas/${id}/fases`}>Fases</LinkBtn>
        <LinkBtn href={`/admin/programas/${id}/dias`}>Dias</LinkBtn>
        <LinkBtn href={`/admin/programas/${id}/publicacao`}>Publicação</LinkBtn>
        <LinkBtn href={`/admin/programas/${id}/clonar`}>Clonar</LinkBtn>
      </div>
    </div>
  );
}
