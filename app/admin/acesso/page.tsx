import { createServerSupabase } from "@/lib/supabase/server";
import { formConceder } from "@/lib/admin/forms";
import { PageHeader, Aviso } from "@/components/admin/ui";

const input =
  "rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold";
const ORIGENS = ["cortesia", "convite", "offline", "interno", "teste"];

export default async function AcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const sb = await createServerSupabase();
  const { data: programas } = await sb.from("programas").select("id, nome").order("nome");
  const { data: turmas } = await sb
    .from("turmas")
    .select("id, codigo, programa_id, programas(nome)")
    .order("codigo");
  const progs = (programas ?? []) as { id: string; nome: string }[];
  const turs = (turmas ?? []) as unknown as {
    id: string;
    codigo: string;
    programas: { nome: string } | null;
  }[];

  return (
    <div className="max-w-lg">
      <PageHeader title="Conceder acesso manual" />
      <Aviso ok={ok} erro={erro} />
      <form action={formConceder} className="flex flex-col gap-3">
        <input type="hidden" name="back" value="/admin/acesso" />
        <label className="flex flex-col gap-1 text-sm text-muted">
          E-mail do guerreiro
          <input name="email" type="email" required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Programa
          <select name="programaId" required className={input}>
            {progs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Turma (opcional — sem turma, fica pendente de alocação)
          <select name="turmaId" className={input}>
            <option value="">— sem turma —</option>
            {turs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.programas?.nome} / {t.codigo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Origem
          <select name="origem" required className={input}>
            {ORIGENS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Motivo (opcional)
          <input name="motivo" className={input} />
        </label>
        <button
          type="submit"
          className="mt-2 self-start rounded-lg bg-gold px-5 py-2 font-medium text-ground transition hover:bg-gold-strong"
        >
          Conceder acesso
        </button>
      </form>
      <p className="mt-4 text-xs text-subtle">
        Sempre cria o entitlement. A matrícula segue a matriz: e-mail sem usuário → criada no
        primeiro acesso; já ativo no programa → só entitlement; cancelada → não reativa.
      </p>
    </div>
  );
}
