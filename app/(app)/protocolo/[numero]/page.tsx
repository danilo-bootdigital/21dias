import Link from "next/link";
import { notFound } from "next/navigation";
import { jornadaContexto } from "@/lib/jornada/contexto";
import { Aviso } from "@/components/admin/ui";
import { DiaProtocoloView, CheckinForm } from "@/components/jornada";

export default async function DiaProtocoloPage({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { numero } = await params;
  const { ok, erro } = await searchParams;
  const n = Number(numero);

  const ctx = await jornadaContexto();
  // Matrícula de referência: ativa (operacional) OU a mais recente (modo leitura).
  const ref = ctx ? (ctx.ativa ?? ctx.matriculas[0] ?? null) : null;
  if (!ctx || !ref) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold">Protocolo</h1>
        <p className="mt-3 text-muted">Você não tem uma jornada no momento.</p>
      </div>
    );
  }

  const { supabase } = ctx;

  const { data: tRow } = await supabase
    .from("turmas")
    .select("programa_id, status")
    .eq("id", ref.turma_id)
    .maybeSingle();
  const t = tRow as { programa_id: string; status: string } | null;
  if (!t || !Number.isFinite(n)) notFound();
  const turmaAtiva = t!.status === "ativa";

  const { data: diaData } = await supabase.rpc("dia_corrente_turma", { p_turma: ref.turma_id });
  const dc = Number(diaData);

  const voltar = (
    <Link href="/protocolo" className="text-sm text-subtle transition hover:text-gold">
      ← Protocolo
    </Link>
  );

  // Dia futuro só é bloqueado em turma ATIVA; em histórico tudo até a duração é leitura.
  if (turmaAtiva && n > dc) {
    return (
      <div>
        {voltar}
        <h1 className="mt-2 font-display text-3xl font-semibold">Dia {n}</h1>
        <p className="mt-3 text-muted">
          🔒 Este dia ainda está bloqueado. Volte quando a jornada chegar ao Dia {n}.
        </p>
      </div>
    );
  }

  const { data: dRow } = await supabase
    .from("protocolo_dias")
    .select(
      "id, numero, titulo, instrucoes, missao_titulo, missao_descricao, missao_pontos, eh_marco, marco_titulo, marco_descricao, programa_fases(nome)",
    )
    .eq("programa_id", t!.programa_id)
    .eq("numero", n)
    .maybeSingle();
  const d = dRow as unknown as {
    id: string;
    numero: number;
    titulo: string | null;
    instrucoes: string | null;
    missao_titulo: string;
    missao_descricao: string | null;
    missao_pontos: number;
    eh_marco: boolean;
    marco_titulo: string | null;
    marco_descricao: string | null;
    programa_fases: { nome: string } | null;
  } | null;
  if (!d) notFound();

  const { data: contData } = await supabase
    .from("protocolo_conteudos")
    .select("tipo, titulo, corpo")
    .eq("dia_id", d!.id)
    .order("ordem");
  const conteudos = (contData ?? []) as { tipo: string; titulo: string | null; corpo: string }[];

  const ehHoje = n === dc;
  // Só opera (check-in) quando há jornada ATIVA operacional e é o dia corrente.
  const podeOperar = !!ctx.ativa && ehHoje && turmaAtiva;

  const { data: habsRow } = await supabase
    .from("habitos_definicao")
    .select("id, nome")
    .eq("programa_id", t!.programa_id)
    .order("ordem");
  const habitos = (habsRow ?? []) as { id: string; nome: string }[];

  const { data: ckRow } = await supabase
    .from("checkins")
    .select("id, missao_completa, check_in_publico")
    .eq("matricula_id", ref.id)
    .eq("dia_numero", n)
    .maybeSingle();
  const ck = ckRow as { id: string; missao_completa: boolean; check_in_publico: boolean } | null;
  let cumpridos: string[] = [];
  if (ck) {
    const { data: chRow } = await supabase
      .from("checkin_habitos")
      .select("habito_id, cumprido")
      .eq("checkin_id", ck.id);
    cumpridos = ((chRow ?? []) as { habito_id: string; cumprido: boolean }[])
      .filter((x) => x.cumprido)
      .map((x) => x.habito_id);
  }

  return (
    <div>
      {voltar}
      <h1 className="mt-2 font-display text-3xl font-semibold">Dia {n}</h1>
      <p className="mb-4 text-sm text-subtle">{d!.programa_fases?.nome ?? "—"}</p>
      <Aviso ok={ok === "checkin" ? "Check-in salvo." : ok} erro={erro} />

      <DiaProtocoloView
        titulo={d!.titulo}
        instrucoes={d!.instrucoes}
        missaoTitulo={d!.missao_titulo}
        missaoDescricao={d!.missao_descricao}
        missaoPontos={d!.missao_pontos}
        ehMarco={d!.eh_marco}
        marcoTitulo={d!.marco_titulo}
        marcoDescricao={d!.marco_descricao}
        conteudos={conteudos}
      />

      <h2 className="mb-2 mt-6 text-sm uppercase tracking-wider text-subtle">Execução</h2>
      {podeOperar ? (
        <CheckinForm
          dia={n}
          podeOperar={podeOperar}
          habitos={habitos}
          cumpridos={cumpridos}
          missaoTitulo={d!.missao_titulo}
          missaoCompleta={ck?.missao_completa ?? false}
          publico={ck?.check_in_publico ?? false}
          retorno={`/protocolo/${n}`}
        />
      ) : ck ? (
        <p className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
          ✅ Concluído — {cumpridos.length}/{habitos.length} inegociáveis
          {ck.missao_completa ? " + missão" : ""}.
        </p>
      ) : (
        <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          ⚠️ Dia sem check-in (não realizado). Não é possível registrar dias passados.
        </p>
      )}
    </div>
  );
}
