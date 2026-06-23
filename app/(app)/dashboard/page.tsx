import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Aviso } from "@/components/admin/ui";
import { IndicadoresHeader, MissaoCard, CheckinForm } from "@/components/jornada";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: duRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const domainId = (duRow as { id: string } | null)?.id;

  const { data: mRow } = await supabase
    .from("matriculas")
    .select("id, turma_id, turmas(codigo, programa_id, status, programas(nome, duracao_dias))")
    .eq("user_id", domainId ?? "")
    .eq("status", "ativa")
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const m = mRow as unknown as {
    id: string;
    turma_id: string;
    turmas: {
      codigo: string;
      programa_id: string;
      status: string;
      programas: { nome: string; duracao_dias: number } | null;
    } | null;
  } | null;

  const operacional = !!m && m.turmas?.status === "ativa";

  if (!operacional) {
    // Sem jornada ativa → modo histórico/leitura (se houver matrícula anterior).
    const { data: histRow } = await supabase
      .from("matriculas")
      .select("id, status, turmas(codigo, programas(nome, duracao_dias))")
      .eq("user_id", domainId ?? "")
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const hist = histRow as unknown as {
      id: string;
      status: string;
      turmas: { codigo: string; programas: { nome: string; duracao_dias: number } | null } | null;
    } | null;

    if (!hist) {
      return (
        <div>
          <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
          <p className="mt-3 text-muted">Você não tem uma jornada ativa no momento.</p>
        </div>
      );
    }

    const { data: paH } = await supabase
      .from("pontuacao_agregada")
      .select("pontos_total, disciplina_final, indice_disciplina, nivel_atual")
      .eq("matricula_id", hist.id)
      .maybeSingle();
    const ph = (paH ?? {}) as {
      pontos_total?: number;
      disciplina_final?: number;
      indice_disciplina?: number;
      nivel_atual?: string;
    };
    const disc = Number(ph.disciplina_final ?? ph.indice_disciplina ?? 0);
    const concluida = hist.status === "concluida";
    const card = "rounded-xl border border-border bg-surface p-4 text-center";
    const linkBtn =
      "rounded-lg border border-border px-4 py-2 text-sm text-subtle transition hover:text-gold";

    return (
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          {hist.turmas?.programas?.nome} · Turma {hist.turmas?.codigo}
        </h1>
        <p className="mb-6 mt-1 inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-sm text-gold">
          {concluida ? "🏁 Você concluiu sua jornada." : "Jornada encerrada."}
        </p>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className={card}>
            <p className="text-2xl font-semibold text-text">{ph.pontos_total ?? 0}</p>
            <p className="mt-1 text-xs text-subtle">Pontos finais</p>
          </div>
          <div className={card}>
            <p className="text-2xl font-semibold text-text">{disc}%</p>
            <p className="mt-1 text-xs text-subtle">Disciplina final</p>
          </div>
          <div className={card}>
            <p className="text-2xl font-semibold text-gold">{ph.nivel_atual ?? "—"}</p>
            <p className="mt-1 text-xs text-subtle">Nível</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/protocolo"
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong"
          >
            Histórico da jornada
          </Link>
          <Link href="/ranking" className={linkBtn}>
            Ranking
          </Link>
          <Link href="/certificado" className={linkBtn}>
            Certificado
          </Link>
        </div>
      </div>
    );
  }

  const programaId = m.turmas!.programa_id;
  const { data: diaData } = await supabase.rpc("dia_corrente_turma", { p_turma: m.turma_id });
  const dia = Number(diaData);
  const podeOperar = m.turmas!.status === "ativa" && dia >= 1;

  const { data: paRow } = await supabase
    .from("pontuacao_agregada")
    .select("pontos_total, streak_atual, indice_disciplina, nivel_atual")
    .eq("matricula_id", m.id)
    .maybeSingle();
  const pa = (paRow ?? {}) as {
    pontos_total?: number;
    streak_atual?: number;
    indice_disciplina?: number;
    nivel_atual?: string;
  };

  const { data: missaoRow } =
    dia >= 1
      ? await supabase
          .from("protocolo_dias")
          .select("missao_titulo, missao_descricao, missao_pontos, programa_fases(nome)")
          .eq("programa_id", programaId)
          .eq("numero", dia)
          .maybeSingle()
      : { data: null };
  const missao = (missaoRow ?? {}) as unknown as {
    missao_titulo?: string;
    missao_descricao?: string;
    missao_pontos?: number;
    programa_fases?: { nome: string } | null;
  };

  const { data: habsRow } = await supabase
    .from("habitos_definicao")
    .select("id, nome")
    .eq("programa_id", programaId)
    .order("ordem");
  const habitos = (habsRow ?? []) as { id: string; nome: string }[];

  const { data: ckRow } = await supabase
    .from("checkins")
    .select("id, missao_completa, check_in_publico, pontos_dia")
    .eq("matricula_id", m.id)
    .eq("dia_numero", dia >= 1 ? dia : -1)
    .maybeSingle();
  const ck = ckRow as {
    id: string;
    missao_completa: boolean;
    check_in_publico: boolean;
    pontos_dia: number;
  } | null;
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

  const { data: rkRow } = await supabase
    .from("ranking_geral")
    .select("posicao")
    .eq("matricula_id", m.id)
    .maybeSingle();
  const posicao = (rkRow as { posicao: number } | null)?.posicao ?? null;

  const faseNome = missao.programa_fases?.nome ?? null;
  const pontosDia = ck?.pontos_dia ?? 0;
  const feito = !!ck;
  const streak = pa.streak_atual ?? 0;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">
        {m.turmas!.programas?.nome} · Turma {m.turmas!.codigo}
      </h1>
      <p className="mb-4 mt-1 text-sm text-subtle">
        Dia {dia} de {m.turmas!.programas?.duracao_dias}
        {faseNome ? ` · Fase ${faseNome}` : ""}
      </p>
      <Aviso ok={ok === "checkin" ? "Check-in salvo." : ok} erro={erro} />

      {dia >= 1 ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface p-4">
            <span
              className={`rounded-full border px-3 py-1 text-sm ${
                feito
                  ? "border-emerald-900/60 text-emerald-300"
                  : "border-amber-900/60 text-amber-300"
              }`}
            >
              {feito ? "✅ Check-in feito" : "⏳ Check-in pendente"}
            </span>
            <span className="text-sm text-subtle">
              Pontos de hoje: <strong className="text-text">{pontosDia}</strong>
            </span>
            {posicao ? (
              <span className="text-sm text-subtle">
                Ranking: <strong className="text-text">{posicao}º</strong>
              </span>
            ) : null}
          </div>

          {podeOperar && !feito ? (
            <p className="mb-3 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
              ⚠️ Você ainda não fez o check-in de hoje. Faça agora para manter a sequência 🔥.
            </p>
          ) : streak === 0 && dia > 1 ? (
            <p className="mb-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              🔥 Sua sequência está zerada. Retome a constância hoje.
            </p>
          ) : null}

          {podeOperar ? (
            <a
              href="#checkin"
              className="mb-6 block w-full rounded-lg bg-gold px-5 py-3 text-center font-semibold text-ground transition hover:bg-gold-strong"
            >
              {feito ? "Revisar check-in de hoje" : "Fazer check-in de hoje"}
            </a>
          ) : null}
        </>
      ) : null}

      <IndicadoresHeader
        streak={streak}
        indice={Number(pa.indice_disciplina ?? 0)}
        pontos={pa.pontos_total ?? 0}
        nivel={pa.nivel_atual ?? "recruta"}
      />

      {dia >= 1 ? (
        <div className="mb-6">
          <MissaoCard
            titulo={missao.missao_titulo ?? "—"}
            descricao={missao.missao_descricao}
            pontos={missao.missao_pontos ?? 0}
          />
          <p className="mt-2 text-sm text-subtle">
            <Link className="text-gold hover:underline" href={`/protocolo/${dia}`}>
              Abrir o dia no Protocolo
            </Link>{" "}
            ·{" "}
            <Link className="text-gold hover:underline" href="/protocolo">
              ver protocolo completo
            </Link>
          </p>
        </div>
      ) : null}

      <h2 id="checkin" className="mb-2 scroll-mt-4 text-sm uppercase tracking-wider text-subtle">
        Os 10 inegociáveis
      </h2>
      <CheckinForm
        dia={dia}
        podeOperar={podeOperar}
        habitos={habitos}
        cumpridos={cumpridos}
        missaoTitulo={missao.missao_titulo ?? "Missão do dia"}
        missaoCompleta={ck?.missao_completa ?? false}
        publico={ck?.check_in_publico ?? false}
      />
    </div>
  );
}
