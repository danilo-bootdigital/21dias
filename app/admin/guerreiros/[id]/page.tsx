import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { StatusBadge, Aviso } from "@/components/admin/ui";
import { AcessoSistema } from "@/components/admin/acesso-sistema";
import { ButtonLink, Card, Tag } from "@/components/ui/primitives";
import { nomeDeGuerreiro } from "@/lib/identity";

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

function Resumo({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-2xl font-extrabold tabular-nums">{valor}</p>
      <p className="mt-0.5 text-[0.7rem] leading-tight text-subtle">{rotulo}</p>
    </div>
  );
}

const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-subtle">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

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

  const { data: perfilRow } = await sb
    .from("guerreiro_profiles")
    .select("nome_guerreiro, cidade, bio, users(email)")
    .eq("user_id", id)
    .maybeSingle();
  const perfil = perfilRow as unknown as {
    nome_guerreiro: string;
    cidade: string | null;
    bio: string | null;
    users: { email: string } | null;
  } | null;

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

  // "Acesso ao Programa" (internamente entitlements). Lê só colunas já existentes.
  const { data: entsRow } = await sb
    .from("entitlements")
    .select("id, origem, status, created_at, granted_by, programas(nome), turmas(codigo)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });
  const ents = (entsRow ?? []) as unknown as {
    id: string;
    origem: string;
    status: string;
    created_at: string;
    granted_by: string | null;
    programas: { nome: string } | null;
    turmas: { codigo: string } | null;
  }[];

  const concedentes = Array.from(new Set(ents.map((e) => e.granted_by).filter(Boolean))) as string[];
  const { data: concRows } = concedentes.length
    ? await sb.from("guerreiro_profiles").select("user_id, nome_guerreiro").in("user_id", concedentes)
    : { data: [] };
  const nomeConcedente = new Map(
    ((concRows ?? []) as { user_id: string; nome_guerreiro: string }[]).map((r) => [
      r.user_id,
      nomeDeGuerreiro(r.nome_guerreiro),
    ]),
  );
  const comMatricula = new Set(mats.map((m) => m.entitlement_id).filter(Boolean));
  const origemPorEnt = new Map(ents.map((e) => [e.id, e.origem] as const));

  // Perfil de acesso atual: role global `admin` => Guerreiro + Administrador.
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

  // Resumo — apenas a partir dos dados já carregados.
  const acessosAtivos = ents.filter((e) => e.status === "ativo").length;
  const email = perfil?.users?.email ?? "";

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

      {/* 2 · Card resumo (acima da dobra) */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-wider text-subtle">Perfil de acesso</span>
          <Tag tone={ehAdmin ? "info" : "neutral"}>
            {ehAdmin ? "Guerreiro + Administrador" : "Guerreiro"}
          </Tag>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Resumo valor={mats.length} rotulo="Matrículas" />
          <Resumo valor={ents.length} rotulo="Direitos de acesso" />
          <Resumo valor={acessosAtivos} rotulo="Ativos" />
        </div>
      </Card>

      {/* 3 · Barra de ações (sticky logo abaixo do header do Admin Shell) */}
      <div className="sticky top-[calc(61px_+_max(12px,env(safe-area-inset-top)))] z-20 -mx-4 border-y border-border bg-ground/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ButtonLink href={`/admin/acesso?user=${id}`} variante="secondary">
            Conceder Acesso
          </ButtonLink>
          <ButtonLink href={`/admin/matriculas/nova?user=${id}`} variante="outline">
            Matricular
          </ButtonLink>
          <ButtonLink href="/admin/guerreiros" variante="ghost">
            Voltar para lista
          </ButtonLink>
        </div>
      </div>

      {/* 4 · Acesso ao Sistema — componente preservado */}
      <AcessoSistema userId={id} ehAdminInicial={ehAdmin} ehProprio={ehProprio} />

      {/* 5 · Matrículas (cards navegáveis) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-wider text-subtle">Matrículas / histórico</h2>
        {mats.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-subtle">
            Sem matrículas.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {mats.map((m) => {
              const origem = m.entitlement_id ? origemPorEnt.get(m.entitlement_id) : undefined;
              return (
                <Link
                  key={m.id}
                  href="/admin/matriculas"
                  className="block rounded-2xl border border-border bg-surface px-4 py-4 transition-colors duration-fast ease-standard hover:border-gold"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-medium text-text">{m.turmas?.programas?.nome ?? "—"}</p>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={m.status} />
                      <ChevronRight />
                    </div>
                  </div>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                    <Info rotulo="Turma" valor={m.turmas?.codigo ?? "—"} />
                    <Info
                      rotulo="Data de entrada"
                      valor={m.joined_at ? new Date(m.joined_at).toLocaleDateString("pt-BR") : "—"}
                    />
                    <Info
                      rotulo="Origem do acesso"
                      valor={origem ? (ORIGEM_LABEL[origem] ?? origem) : "—"}
                    />
                  </dl>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 6 · Acesso ao Programa (cards) */}
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
                  <Info
                    rotulo="Concedido por"
                    valor={e.granted_by ? (nomeConcedente.get(e.granted_by) ?? "—") : "—"}
                  />
                  <Info rotulo="Turma vinculada" valor={e.turmas?.codigo ?? "—"} />
                  <Info rotulo="Matrícula vinculada" valor={comMatricula.has(e.id) ? "Sim" : "Não"} />
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
