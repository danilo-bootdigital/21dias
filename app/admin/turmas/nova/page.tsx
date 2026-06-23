import { createServerSupabase } from "@/lib/supabase/server";
import { criarTurma } from "@/lib/admin/turmas";
import { PageHeader, Aviso } from "@/components/admin/ui";

const input =
  "rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold";

export default async function NovaTurmaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const sb = await createServerSupabase();
  const { data: programas } = await sb.from("programas").select("id, nome").order("nome");
  const progs = (programas ?? []) as { id: string; nome: string }[];

  return (
    <div className="max-w-lg">
      <PageHeader title="Nova turma" />
      <Aviso erro={erro} />
      <form action={criarTurma} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Programa
          <select name="programa_id" required className={input}>
            {progs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Código (ex.: 002)
          <input name="codigo" required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Timezone
          <input name="timezone" defaultValue="America/Sao_Paulo" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Início (opcional)
          <input name="starts_at" type="datetime-local" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Capacidade máxima (opcional)
          <input name="tamanho_max" type="number" min="1" className={input} />
        </label>
        <button
          type="submit"
          className="mt-2 self-start rounded-lg bg-gold px-5 py-2 font-medium text-ground transition hover:bg-gold-strong"
        >
          Criar turma
        </button>
      </form>
    </div>
  );
}
