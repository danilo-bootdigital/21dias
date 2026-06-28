import { createServerSupabase } from "@/lib/supabase/server";
import { formConceder } from "@/lib/admin/forms";
import { PageHeader, Aviso } from "@/components/admin/ui";
import { TextInput, Select } from "@/components/ui/fields";
import { Button } from "@/components/ui/primitives";

const ORIGENS = ["cortesia", "convite", "offline", "interno", "teste"];

export default async function AcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string; user?: string }>;
}) {
  const { ok, erro, user } = await searchParams;
  const sb = await createServerSupabase();

  // Pré-preenchimento: resolve o e-mail do Guerreiro a partir de ?user=<uuid>
  // (arquitetura existente; sem alterar a server action nem a concessão).
  let emailPre = "";
  if (user) {
    const { data: uRow } = await sb.from("users").select("email").eq("id", user).maybeSingle();
    emailPre = (uRow as { email: string } | null)?.email ?? "";
  }
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

      {/* Server action e nomes dos campos preservados: email/programaId/turmaId/origem/motivo/back */}
      <form action={formConceder} className="flex flex-col gap-4">
        <input type="hidden" name="back" value="/admin/acesso" />

        <TextInput
          label="E-mail do guerreiro"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          defaultValue={emailPre}
          required
        />

        <Select label="Programa" name="programaId" required>
          {progs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>

        <Select
          label="Turma"
          name="turmaId"
          defaultValue=""
          hint="Opcional — sem turma, fica pendente de alocação."
        >
          <option value="">— sem turma —</option>
          {turs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.programas?.nome} / {t.codigo}
            </option>
          ))}
        </Select>

        <Select label="Origem do acesso" name="origem" defaultValue="cortesia" required>
          {ORIGENS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>

        <TextInput label="Motivo (opcional)" name="motivo" />

        <Button type="submit" variante="primary" className="mt-1">
          Conceder acesso
        </Button>
      </form>

      <p className="mt-4 text-xs text-subtle">
        Sempre cria o direito de acesso. A matrícula segue a matriz: e-mail sem usuário → criada no
        primeiro acesso; já ativo no programa → só o acesso; cancelada → não reativa.
      </p>
    </div>
  );
}
