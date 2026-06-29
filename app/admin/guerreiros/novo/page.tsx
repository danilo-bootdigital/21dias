import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, Aviso } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/primitives";
import { NovoGuerreiroForm } from "@/components/admin/novo-guerreiro-form";

/**
 * Novo Guerreiro — ponto de entrada único para incluir alguém no sistema.
 * Carrega programas/turmas e delega o fluxo (4 etapas) ao wizard cliente.
 * Toda a orquestração ocorre em lib/admin/criar-guerreiro.ts.
 */
export default async function NovoGuerreiroPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const sb = await createServerSupabase();

  const { data: progRows } = await sb.from("programas").select("id, nome").order("nome");
  const { data: turmaRows } = await sb
    .from("turmas")
    .select("id, codigo, programa_id, status")
    .order("codigo");

  const programas = (progRows ?? []) as { id: string; nome: string }[];
  const turmas = (turmaRows ?? []) as {
    id: string;
    codigo: string;
    programa_id: string;
    status: string;
  }[];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <PageHeader title="Novo Guerreiro" />
      <Aviso erro={erro} />
      <p className="text-sm text-muted">
        Cadastre um novo Guerreiro em um único fluxo — dados, programa, permissões e acesso.
      </p>

      <NovoGuerreiroForm programas={programas} turmas={turmas} />

      <ButtonLink href="/admin/guerreiros" variante="ghost">
        Cancelar
      </ButtonLink>
    </div>
  );
}
