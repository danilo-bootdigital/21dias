import Link from "next/link";
import { notFound } from "next/navigation";
import {
  obterPrograma,
  listarFases,
  turmaIniciada,
  proximoNumeroDia,
} from "@/lib/admin/protocolo-data";
import { PageHeader, Aviso } from "@/components/admin/ui";
import { SubNavProtocolo, ProtocoloForm } from "@/components/admin/protocolo";

export default async function NovoProtocoloPage({
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

  const [fases, travado, proximo] = await Promise.all([
    listarFases(id),
    turmaIniciada(id),
    proximoNumeroDia(id),
  ]);

  return (
    <div>
      <PageHeader title={`${programa.nome} — Inserir Protocolo`} />
      <SubNavProtocolo programaId={id} ativo="dias" />
      <Aviso ok={ok ? "Operação concluída." : undefined} erro={erro} />

      {travado ? (
        <p className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          🔒 Turma já iniciada — não é possível inserir novos protocolos neste programa.{" "}
          <Link href={`/admin/programas/${id}/dias`} className="underline">
            Voltar aos protocolos
          </Link>
          .
        </p>
      ) : fases.length === 0 ? (
        <p className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          Cadastre ao menos uma{" "}
          <Link href={`/admin/programas/${id}/fases`} className="underline">
            fase
          </Link>{" "}
          antes de inserir um protocolo.
        </p>
      ) : (
        <ProtocoloForm programaId={id} fases={fases} travado={travado} proximoNumero={proximo} />
      )}
    </div>
  );
}
