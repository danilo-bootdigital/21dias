import { createServerSupabase } from "@/lib/supabase/server";
import { StatusBadge, Aviso } from "@/components/admin/ui";
import { AcessoSistema } from "@/components/admin/acesso-sistema";
import { ButtonLink, Card, Button, buttonClasses } from "@/components/ui/primitives";
import { TextInput, Select } from "@/components/ui/fields";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { nomeDeGuerreiro } from "@/lib/identity";
import { editarGuerreiroPerfil, reenviarConvite, excluirGuerreiro } from "@/lib/admin/guerreiros-actions";
import { formConceder, formCancelar, formReativar } from "@/lib/admin/forms";

const ORIGEM_LABEL: Record<string, string> = {
  compra: "Compra",
  cortesia: "Cortesia",
  convite: "Convite",
  offline: "Offline",
  interno: "Interno",
  teste: "Teste",
  manual: "Manual",
};

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-subtle">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-text">{valor}</dd>
    </div>
  );
}

export default async function GuerreiroDetalhe({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id } = await params; // = users.id
  const { ok, erro } = await searchParams;
  const sb = await createServerSupabase();
  const back = `/admin/guerreiros/${id}`;

  const { data: perfilRow } = await sb
    .from("guerreiro_profiles")
    .select("nome_guerreiro, cidade, foto_url, users(email)")
    .eq("user_id", id)
    .maybeSingle();
  const perfil = perfilRow as unknown as {
    nome_guerreiro: string;
    cidade: string | null;
    foto_url: string | null;
    users: { email: string } | null;
  } | null;
  const email = perfil?.users?.email ?? "";

  const { data: matsRow } = await sb
    .from("matriculas")
    .select("id, status, joined_at, entitlement_id, turmas(codigo, programas(nome))")
    .eq("user_id", id)
    .order("joined_at", { ascending: false });
  const mats = (matsRow ?? []) as unknown as {
    id: string;
    status: string;
    joined_at: string | null;
    entitlement_id: string | null;
    turmas: { codigo: string; programas: { nome: string } | null } | null;
  }[];

  const { data: entsRow } = await sb
    .from("entitlements")
    .select("id, origem, status, created_at, programas(nome), turmas(codigo)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });
  const ents = (entsRow ?? []) as unknown as {
    id: string;
    origem: string;
    status: string;
    created_at: string;
    programas: { nome: string } | null;
    turmas: { codigo: string } | null;
  }[];
  const comMatricula = new Set(mats.map((m) => m.entitlement_id).filter(Boolean));

  // Programas/turmas para a concessão inline de acesso.
  const { data: progRows } = await sb.from("programas").select("id, nome").order("nome");
  const { data: turmaRows } = await sb
    .from("turmas")
    .select("id, codigo, programas(nome)")
    .order("codigo");
  const programas = (progRows ?? []) as { id: string; nome: string }[];
  const turmas = (turmaRows ?? []) as unknown as {
    id: string;
    codigo: string;
    programas: { nome: string } | null;
  }[];

  // Permissão atual + auto-edição (evita lockout).
  const { data: adminRoleRow } = await sb
    .from("user_roles")
    .select("id")
    .eq("user_id", id)
    .eq("role", "admin")
    .eq("scope_type", "global")
    .limit(1)
    .maybeSingle();
  const ehAdmin = Boolean(adminRoleRow);

  const {
    data: { user: authUser },
  } = await sb.auth.getUser();
  const { data: meRow } = authUser
    ? await sb.from("users").select("id").eq("auth_user_id", authUser.id).maybeSingle()
    : { data: null };
  const ehProprio = (meRow as { id: string } | null)?.id === id;

  return (
    <div className="flex flex-col gap-6">
      {/* 1 · Cabeçalho */}
      <header>
        <h1 className="font-display text-2xl font-semibold">{nomeDeGuerreiro(perfil?.nome_guerreiro)}</h1>
        <p className="mt-1 break-all text-sm text-muted">
          {email || "—"}
          {perfil?.cidade ? ` · ${perfil.cidade}` : ""}
        </p>
        <Aviso ok={ok} erro={erro} />
      </header>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <form action={reenviarConvite}>
          <input type="hidden" name="user_id" value={id} />
          <Button type="submit" variante="outline">
            Reenviar convite
          </Button>
        </form>
        <ButtonLink href="/admin/guerreiros" variante="ghost">
          Voltar para a lista
        </ButtonLink>
      </div>

      {/* 2 · Dados pessoais (edição inline) */}
      <section className="rounded-2xl border border-border bg-surface-raised px-4 py-4">
        <h2 className="mb-3 text-sm uppercase tracking-wider text-subtle">Dados pessoais</h2>
        <form action={editarGuerreiroPerfil} className="flex flex-col gap-4">
          <input type="hidden" name="user_id" value={id} />
          <TextInput label="Nome do Guerreiro" name="nome_guerreiro" defaultValue={perfil?.nome_guerreiro ?? ""} required />
          <TextInput label="Cidade" name="cidade" defaultValue={perfil?.cidade ?? ""} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted" htmlFor="foto">
              Trocar foto (opcional)
            </label>
            <input
              id="foto"
              name="foto"
              type="file"
              accept="image/*"
              className="min-h-tap rounded-xl border border-border bg-ground px-3.5 py-2.5 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-text"
            />
          </div>
          <Button type="submit" variante="primary" fullWidth={false}>
            Salvar dados
          </Button>
        </form>
      </section>

      {/* 3 · Acesso ao Sistema (permissões) */}
      <AcessoSistema userId={id} ehAdminInicial={ehAdmin} ehProprio={ehProprio} />

      {/* 4 · Matrículas + lifecycle (desativar/reativar) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-wider text-subtle">Matrículas</h2>
        {mats.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-subtle">
            Sem matrículas. Use “Adicionar acesso” abaixo.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {mats.map((m) => (
              <Card key={m.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-text">{m.turmas?.programas?.nome ?? "—"}</p>
                  <StatusBadge value={m.status} />
                </div>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                  <Info rotulo="Turma" valor={m.turmas?.codigo ?? "—"} />
                  <Info
                    rotulo="Entrada"
                    valor={m.joined_at ? new Date(m.joined_at).toLocaleDateString("pt-BR") : "—"}
                  />
                </dl>
                {m.status === "ativa" ? (
                  <form action={formCancelar}>
                    <input type="hidden" name="matriculaId" value={m.id} />
                    <input type="hidden" name="back" value={back} />
                    <Button type="submit" variante="danger" fullWidth={false}>
                      Desativar acesso
                    </Button>
                  </form>
                ) : m.status === "cancelada" ? (
                  <form action={formReativar}>
                    <input type="hidden" name="matriculaId" value={m.id} />
                    <input type="hidden" name="back" value={back} />
                    <Button type="submit" variante="success" fullWidth={false}>
                      Reativar acesso
                    </Button>
                  </form>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 5 · Adicionar acesso (programa/turma) — inline, reusa concederAcessoManual */}
      <section className="rounded-2xl border border-border bg-surface px-4 py-4">
        <h2 className="mb-3 text-sm uppercase tracking-wider text-subtle">Adicionar acesso</h2>
        <form action={formConceder} className="flex flex-col gap-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="origem" value="interno" />
          <input type="hidden" name="back" value={back} />
          <Select label="Programa" name="programaId" defaultValue="" required>
            <option value="" disabled>
              Selecione…
            </option>
            {programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
          <Select label="Turma" name="turmaId" defaultValue="" hint="Opcional — sem turma fica pendente de alocação.">
            <option value="">— sem turma —</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.programas?.nome} / {t.codigo}
              </option>
            ))}
          </Select>
          <Button type="submit" variante="secondary" fullWidth={false}>
            Conceder acesso
          </Button>
        </form>
      </section>

      {/* 6 · Acesso ao Programa (técnico, leitura) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-wider text-subtle">Acesso ao Programa</h2>
        {ents.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-subtle">
            Nenhum direito de acesso registrado.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {ents.map((e) => (
              <div key={e.id} className="rounded-2xl border border-border bg-surface px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-medium text-text">{e.programas?.nome ?? "—"}</p>
                  <StatusBadge value={e.status} />
                </div>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                  <Info rotulo="Origem do acesso" valor={ORIGEM_LABEL[e.origem] ?? e.origem} />
                  <Info
                    rotulo="Data da concessão"
                    valor={new Date(e.created_at).toLocaleDateString("pt-BR")}
                  />
                  <Info rotulo="Turma vinculada" valor={e.turmas?.codigo ?? "—"} />
                  <Info rotulo="Matrícula vinculada" valor={comMatricula.has(e.id) ? "Sim" : "Não"} />
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7 · Zona de perigo — exclusão definitiva */}
      <section className="rounded-2xl border border-danger/40 bg-danger/[0.04] px-4 py-4">
        <h2 className="mb-1 text-sm uppercase tracking-wider text-danger">Zona de perigo</h2>
        <p className="mb-3 text-xs text-subtle">
          A exclusão remove acesso, perfil, matrículas e todo o histórico. Não pode ser desfeita.
        </p>
        <form action={excluirGuerreiro}>
          <input type="hidden" name="user_id" value={id} />
          <input type="hidden" name="back" value="/admin/guerreiros" />
          <ConfirmSubmit
            message={`Excluir ${nomeDeGuerreiro(perfil?.nome_guerreiro)} definitivamente? Remove acesso, perfil, matrículas e todo o histórico. Esta ação NÃO pode ser desfeita.`}
            className={buttonClasses("danger", false)}
          >
            Excluir guerreiro
          </ConfirmSubmit>
        </form>
      </section>
    </div>
  );
}
