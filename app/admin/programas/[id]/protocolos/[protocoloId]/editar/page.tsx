import { notFound } from "next/navigation";
import {
  obterPrograma,
  obterProtocoloPorId,
  listarFases,
  turmaIniciada,
  listarConteudos,
  listarCheckinItens,
  listarCamposImagem,
} from "@/lib/admin/protocolo-data";
import { PageHeader, Aviso } from "@/components/admin/ui";
import {
  SubNavProtocolo,
  LockBanner,
  ProtocoloForm,
  ExcluirProtocoloBtn,
  CheckinItensEditor,
  CamposImagemEditor,
  ConteudoForm,
  ConteudoList,
} from "@/components/admin/protocolo";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm uppercase tracking-wider text-subtle">{titulo}</h2>
      {children}
    </section>
  );
}

export default async function EditarProtocoloPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; protocoloId: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id, protocoloId } = await params;
  const { ok, erro } = await searchParams;

  const programa = await obterPrograma(id);
  if (!programa) notFound();

  const [protocolo, fases, travado] = await Promise.all([
    obterProtocoloPorId(id, protocoloId),
    listarFases(id),
    turmaIniciada(id),
  ]);
  if (!protocolo) notFound();

  const [conteudos, itens, campos] = await Promise.all([
    listarConteudos(protocolo.id),
    listarCheckinItens(protocolo.id),
    listarCamposImagem(protocolo.id),
  ]);

  return (
    <div>
      <PageHeader title={`${programa.nome} — Protocolo (Dia ${protocolo.numero})`} />
      <SubNavProtocolo programaId={id} ativo="dias" />
      <Aviso ok={ok ? "Operação concluída." : undefined} erro={erro} />
      <LockBanner travado={travado} />

      <Secao titulo="Dados do protocolo">
        <ProtocoloForm programaId={id} fases={fases} travado={travado} protocolo={protocolo} />
      </Secao>

      <Secao titulo={`Check-in do Dia (${itens.length})`}>
        <CheckinItensEditor programaId={id} protocoloId={protocolo.id} itens={itens} />
      </Secao>

      <Secao titulo="Campos de Imagem (máx. 3)">
        <CamposImagemEditor programaId={id} protocoloId={protocolo.id} campos={campos} />
      </Secao>

      <Secao titulo={`Conteúdos do dia (${conteudos.length})`}>
        <div className="mb-4">
          <ConteudoForm programaId={id} diaId={protocolo.id} numero={protocolo.numero} />
        </div>
        <ConteudoList
          programaId={id}
          diaId={protocolo.id}
          numero={protocolo.numero}
          conteudos={conteudos}
        />
      </Secao>

      {!travado ? (
        <section className="border-t border-border pt-6">
          <h2 className="mb-3 text-sm uppercase tracking-wider text-subtle">Zona de risco</h2>
          <ExcluirProtocoloBtn programaId={id} protocoloId={protocolo.id} />
        </section>
      ) : null}
    </div>
  );
}
