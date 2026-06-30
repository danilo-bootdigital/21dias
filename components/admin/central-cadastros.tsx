import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Card, Tag, Badge, ButtonLink, Button } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/cards";
import { Aviso } from "@/components/admin/ui";
import { reenviarConvite } from "@/lib/admin/guerreiros-actions";
import { formCancelar, formReativar } from "@/lib/admin/forms";
import { STATUS_META, FILTROS, FLUXO, type CadastroRow, type StatusOp } from "@/lib/admin/cadastros-data";

const BACK = "/admin/guerreiros";

/** Cards indicadores no topo (clicáveis → filtram a lista). */
const INDICADORES: StatusOp[] = [
  "aguardando_matricula",
  "convite_pendente",
  "nunca_acessou",
  "ativo",
  "concluido",
];

function dataCurta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.62rem] uppercase tracking-wider text-subtle">{rotulo}</dt>
      <dd className="truncate text-sm text-text">{valor}</dd>
    </div>
  );
}

/** Barra de progresso do fluxo operacional (Cadastro → … → Concluído). */
function Fluxo({ passo }: { passo: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Etapa ${passo} de ${FLUXO.length}`}>
      {FLUXO.map((_, i) => {
        const n = i + 1;
        const on = passo >= n;
        return <span key={n} className={`h-1 flex-1 rounded-full ${on ? "bg-gold" : "bg-surface-raised"}`} />;
      })}
    </div>
  );
}

function Acoes({ r }: { r: CadastroRow }) {
  const editar = (
    <ButtonLink href={`/admin/guerreiros/${r.userId}`} variante="secondary" fullWidth={false}>
      Editar
    </ButtonLink>
  );
  const enviarConvite = (label: string) => (
    <form action={reenviarConvite}>
      <input type="hidden" name="user_id" value={r.userId} />
      <input type="hidden" name="back" value={BACK} />
      <Button type="submit" variante="outline" fullWidth={false}>
        {label}
      </Button>
    </form>
  );
  const lifecycle = (action: typeof formCancelar, label: string, variante: "danger" | "success") =>
    r.matriculaId ? (
      <form action={action}>
        <input type="hidden" name="matriculaId" value={r.matriculaId} />
        <input type="hidden" name="back" value={BACK} />
        <Button type="submit" variante={variante} fullWidth={false}>
          {label}
        </Button>
      </form>
    ) : null;

  return (
    <div className="flex flex-wrap gap-2">
      {r.status === "aguardando_matricula" ? (
        <ButtonLink href={`/admin/guerreiros/${r.userId}`} variante="primary" fullWidth={false}>
          Matricular
        </ButtonLink>
      ) : null}
      {r.status === "convite_pendente" ? enviarConvite("Enviar convite") : null}
      {r.status === "nunca_acessou" ? enviarConvite("Reenviar convite") : null}
      {r.status === "ativo" ? lifecycle(formCancelar, "Desativar", "danger") : null}
      {r.status === "cancelado" ? lifecycle(formReativar, "Reativar", "success") : null}
      {editar}
    </div>
  );
}

export function CentralCadastros({
  rows,
  filtro,
  ok,
  erro,
}: {
  rows: CadastroRow[];
  filtro: string;
  ok?: string;
  erro?: string;
}) {
  const contagem = (s: StatusOp) => rows.filter((r) => r.status === s).length;
  const filtroAtivo = FILTROS.find((f) => f.key === filtro) ?? FILTROS[0];
  const lista = rows.filter((r) => filtroAtivo.test(r.status));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Central de Cadastros</h1>
        <p className="mt-1 text-sm text-muted">Tudo que precisa de ação, em um só lugar.</p>
      </div>
      <Aviso ok={ok} erro={erro} />

      <ButtonLink href="/admin/guerreiros/novo" variante="primary">
        ➕ Novo Guerreiro
      </ButtonLink>

      {/* Indicadores (clicáveis) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {INDICADORES.map((s) => {
          const meta = STATUS_META[s];
          const ativo = filtro === s;
          return (
            <Link
              key={s}
              href={`/admin/guerreiros?f=${s}`}
              className={`rounded-2xl border bg-surface px-3 py-3 text-center transition-colors duration-fast ease-standard ${
                ativo ? "border-gold" : "border-border hover:border-gold/40"
              }`}
            >
              <p className="font-display text-2xl font-extrabold tabular-nums text-text">{contagem(s)}</p>
              <p className="mt-0.5 text-[0.6rem] leading-tight text-subtle">
                {meta.dot} {meta.label}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTROS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/guerreiros?f=${f.key}`}
            className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-colors duration-fast ease-standard ${
              filtroAtivo.key === f.key ? "border-gold text-gold" : "border-border text-subtle hover:text-gold"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <EmptyState titulo="Nada por aqui">
          Nenhum cadastro neste filtro. Use ➕ Novo Guerreiro para incluir alguém.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {lista.map((r) => {
            const meta = STATUS_META[r.status];
            return (
              <Card key={r.userId} className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Avatar src={r.foto} nome={r.nome} size={44} className="ring-1 ring-white/10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex items-center gap-1.5 truncate font-medium text-text">
                        {r.nome}
                        {r.recente ? <Badge tone="gold">Novo</Badge> : null}
                      </p>
                      <Tag tone={meta.tone} className="shrink-0">
                        {meta.dot} {meta.label}
                      </Tag>
                    </div>
                    <p className="truncate text-xs text-muted">
                      {r.cidade ? `${r.cidade} · ` : ""}
                      {r.email}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3">
                  <Info rotulo="Programa" valor={r.programa ?? "—"} />
                  <Info rotulo="Turma" valor={r.turma ?? "—"} />
                  <Info rotulo="Cadastro" valor={dataCurta(r.createdAt)} />
                  <Info rotulo="Permissão" valor={r.ehAdmin ? "Guerreiro + Admin" : "Guerreiro"} />
                </dl>

                <Fluxo passo={meta.passo} />
                <Acoes r={r} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
