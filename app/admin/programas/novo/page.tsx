import Link from "next/link";
import { temporadasSelect } from "@/lib/admin/programas-data";
import { PageHeader, Aviso } from "@/components/admin/ui";
import { ProgramaForm } from "@/components/admin/programas-ui";

export default async function NovoProgramaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const temporadas = await temporadasSelect();

  return (
    <div>
      <PageHeader
        title="Novo Programa"
        action={
          <Link href="/admin/programas" className="text-sm text-subtle transition hover:text-gold">
            ← Voltar
          </Link>
        }
      />
      <Aviso erro={erro} />

      {temporadas.length === 0 ? (
        <p className="rounded-2xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          Cadastre uma temporada antes de criar programas.
        </p>
      ) : (
        <ProgramaForm temporadas={temporadas} />
      )}
    </div>
  );
}
