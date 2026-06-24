import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { turmaIniciada } from "@/lib/admin/protocolo-data";
import {
  obterProgramaAdmin,
  contagensPrograma,
  statusPrograma,
} from "@/lib/admin/programas-data";
import { PageHeader, Aviso } from "@/components/admin/ui";
import { SubNavProtocolo, LockBanner, InserirProtocoloBtn } from "@/components/admin/protocolo";
import { ProgramaStatusBadge } from "@/components/admin/programas-ui";

function Stat({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-2xl font-semibold text-text">{valor}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-subtle">{label}</p>
    </div>
  );
}

export default async function VisaoGeralPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { ok, erro } = await searchParams;
  const programa = await obterProgramaAdmin(id);
  if (!programa) notFound();

  const sb = await createServerSupabase();
  const [contagens, travado, { data: tempRow }] = await Promise.all([
    contagensPrograma(id),
    turmaIniciada(id),
    sb.from("temporadas").select("nome, ano").eq("id", programa.temporada_id).maybeSingle(),
  ]);
  const temporada = tempRow as { nome: string; ano: number } | null;
  const status = statusPrograma(programa);
  const atualizado = programa.updated_at
    ? new Date(programa.updated_at).toLocaleString("pt-BR")
    : "—";

  return (
    <div>
      <PageHeader title={programa.nome} action={<ProgramaStatusBadge status={status} />} />
      <SubNavProtocolo programaId={id} ativo="" />
      <Aviso ok={ok} erro={erro} />
      <LockBanner travado={travado} />

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-subtle">Temporada</dt>
            <dd className="text-sm text-text">
              {temporada ? `${temporada.nome} (${temporada.ano})` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-subtle">Última atualização</dt>
            <dd className="text-sm text-text">{atualizado}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wider text-subtle">Descrição</dt>
            <dd className="text-sm text-muted">{programa.descricao || "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Duração (dias)" valor={programa.duracao_dias} />
        <Stat label="Fases" valor={contagens.fases} />
        <Stat label="Dias cadastrados" valor={contagens.dias} />
        <Stat label="Conteúdos" valor={contagens.conteudos} />
      </div>

      <div className="flex flex-wrap gap-3">
        <InserirProtocoloBtn programaId={id} travado={travado} />
        <Link
          href={`/admin/programas/${id}/editar`}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong"
        >
          Editar programa
        </Link>
        {(["fases", "dias", "publicacao", "clonar"] as const).map((slug) => (
          <Link
            key={slug}
            href={`/admin/programas/${id}/${slug}`}
            className="rounded-lg border border-border px-4 py-2 text-sm text-subtle transition hover:border-gold hover:text-gold"
          >
            {slug === "publicacao" ? "Publicação" : slug[0].toUpperCase() + slug.slice(1)}
          </Link>
        ))}
      </div>
    </div>
  );
}
