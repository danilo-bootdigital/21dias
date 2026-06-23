import { notFound } from "next/navigation";
import { obterPrograma, listarFases } from "@/lib/admin/protocolo-data";
import { PageHeader, Aviso } from "@/components/admin/ui";
import { SubNavProtocolo, FaseForm, FaseList } from "@/components/admin/protocolo";

export default async function FasesPage({
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
  const fases = await listarFases(id);

  return (
    <div>
      <PageHeader title={`${programa.nome} — Fases`} />
      <SubNavProtocolo programaId={id} ativo="fases" />
      <Aviso ok={ok ? "Operação concluída." : undefined} erro={erro} />
      <FaseForm programaId={id} />
      <FaseList programaId={id} fases={fases} />
    </div>
  );
}
