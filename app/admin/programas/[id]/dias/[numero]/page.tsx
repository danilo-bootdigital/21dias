import { notFound } from "next/navigation";
import {
  obterPrograma,
  obterDia,
  listarConteudos,
  listarFases,
  turmaIniciada,
} from "@/lib/admin/protocolo-data";
import { PageHeader, Aviso } from "@/components/admin/ui";
import { SubNavProtocolo, DiaForm, ConteudoForm, ConteudoList } from "@/components/admin/protocolo";

export default async function EditarDiaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; numero: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id, numero } = await params;
  const { ok, erro } = await searchParams;
  const n = Number(numero);
  const programa = await obterPrograma(id);
  if (!programa || !Number.isFinite(n)) notFound();

  const [dia, fases, travado] = await Promise.all([
    obterDia(id, n),
    listarFases(id),
    turmaIniciada(id),
  ]);
  if (!dia) notFound();
  const conteudos = await listarConteudos(dia.id);

  return (
    <div>
      <PageHeader title={`${programa.nome} — Dia ${dia.numero}`} />
      <SubNavProtocolo programaId={id} ativo="dias" />
      <Aviso ok={ok ? "Operação concluída." : undefined} erro={erro} />

      <section className="mb-8">
        <DiaForm programaId={id} dia={dia} fases={fases} travado={travado} />
      </section>

      <section>
        <h2 className="mb-3 text-sm uppercase tracking-wider text-subtle">
          Conteúdos do dia ({conteudos.length})
        </h2>
        <div className="mb-4">
          <ConteudoForm programaId={id} diaId={dia.id} numero={dia.numero} />
        </div>
        <ConteudoList programaId={id} diaId={dia.id} numero={dia.numero} conteudos={conteudos} />
      </section>
    </div>
  );
}
