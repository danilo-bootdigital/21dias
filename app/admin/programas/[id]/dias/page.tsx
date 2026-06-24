import { notFound } from "next/navigation";
import { obterPrograma, listarDias, turmaIniciada } from "@/lib/admin/protocolo-data";
import { PageHeader, Aviso } from "@/components/admin/ui";
import { SubNavProtocolo, DiaList, InserirProtocoloBtn } from "@/components/admin/protocolo";

export default async function DiasPage({
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
  const [dias, travado] = await Promise.all([listarDias(id), turmaIniciada(id)]);

  return (
    <div>
      <PageHeader
        title={`${programa.nome} — Protocolos`}
        action={<InserirProtocoloBtn programaId={id} travado={travado} />}
      />
      <SubNavProtocolo programaId={id} ativo="dias" />
      <Aviso ok={ok ? "Operação concluída." : undefined} erro={erro} />
      <DiaList programaId={id} dias={dias} />
    </div>
  );
}
