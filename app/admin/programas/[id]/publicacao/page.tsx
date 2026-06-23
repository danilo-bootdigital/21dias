import { notFound } from "next/navigation";
import { obterPrograma, pendenciasPublicacao, turmaIniciada } from "@/lib/admin/protocolo-data";
import { PageHeader, Aviso, StatusBadge } from "@/components/admin/ui";
import {
  SubNavProtocolo,
  PendenciasPanel,
  ChecklistPublicacao,
  PublicarControls,
} from "@/components/admin/protocolo";

const OK_MSG: Record<string, string> = {
  publicado: "Programa publicado.",
  despublicado: "Programa despublicado.",
};

export default async function PublicacaoPage({
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

  const [pend, travado] = await Promise.all([pendenciasPublicacao(id), turmaIniciada(id)]);
  const podePublicar = pend.length === 0;

  return (
    <div>
      <PageHeader
        title={`${programa.nome} — Publicação`}
        action={<StatusBadge value={programa.is_publicado ? "publicado" : "rascunho"} />}
      />
      <SubNavProtocolo programaId={id} ativo="publicacao" />
      <Aviso ok={ok ? (OK_MSG[ok] ?? "Operação concluída.") : undefined} erro={erro} />

      <p className="mb-6 text-sm text-subtle">
        Status: <strong>{programa.is_publicado ? "publicado" : "rascunho"}</strong> · Turma
        iniciada: <strong>{travado ? "sim" : "não"}</strong>
      </p>

      <PendenciasPanel pendencias={pend} />
      <ChecklistPublicacao pendencias={pend} />

      <PublicarControls
        programaId={id}
        isPublicado={programa.is_publicado}
        podePublicar={podePublicar}
        turmaIniciada={travado}
      />
    </div>
  );
}
