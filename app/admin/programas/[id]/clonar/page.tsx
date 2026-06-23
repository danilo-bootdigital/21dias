import { notFound } from "next/navigation";
import { obterPrograma, listarFases, listarDias } from "@/lib/admin/protocolo-data";
import { PageHeader, Aviso, StatusBadge } from "@/components/admin/ui";
import { SubNavProtocolo, ClonarForm } from "@/components/admin/protocolo";

export default async function ClonarPage({
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

  const [fases, dias] = await Promise.all([listarFases(id), listarDias(id)]);
  const totalConteudos = dias.reduce((s, d) => s + d.conteudos, 0);

  return (
    <div>
      <PageHeader
        title={`${programa.nome} — Clonar`}
        action={<StatusBadge value={programa.is_publicado ? "publicado" : "rascunho"} />}
      />
      <SubNavProtocolo programaId={id} ativo="clonar" />
      <Aviso ok={ok ? "Operação concluída." : undefined} erro={erro} />

      <div className="mb-6 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <p>
          Programa original: <strong>{programa.nome}</strong>
        </p>
        <p>
          Status: {programa.is_publicado ? "publicado" : "rascunho"} · Duração:{" "}
          {programa.duracao_dias} dias
        </p>
        <p>
          {fases.length} fase(s) · {dias.length} dia(s) · {totalConteudos} conteúdo(s)
        </p>
      </div>

      <p className="mb-4 text-sm text-subtle">
        O clone copia <strong>fases, dias, conteúdos, marcos e hábitos</strong>. Não copia turmas,
        matrículas, check-ins, pontuação, rankings, encerramentos, certificados, hall nem
        conquistas. O novo programa nasce como <strong>rascunho</strong>.
      </p>

      <ClonarForm programaId={id} isPublicado={programa.is_publicado} />
    </div>
  );
}
