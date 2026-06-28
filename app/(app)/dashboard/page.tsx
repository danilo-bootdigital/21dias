import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { ButtonLink, Eyebrow, ScreenTitle, Tag } from "@/components/ui/primitives";
import { EmptyState, StatCard } from "@/components/ui/cards";
import { HojeView } from "./_components/hoje-view";

/**
 * Tela "Hoje" (ex-Dashboard). Apenas a montagem de dados acontece aqui; a
 * apresentação vive em <HojeView> e usa só components/ui. Reusa a jornada/
 * scoring existentes — nenhuma regra de negócio nova.
 */
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

  const { data: duRow } = await supabase.from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
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

  // ---------- Sem jornada ativa: histórico/leitura ----------
  if (!operacional) {
    const { data: histRow } = await supabase
      .from("matriculas")
      .select("id, status, turmas(codigo, programas(nome))")
      .eq("user_id", domainId ?? "")
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const hist = histRow as unknown as {
      id: string;
      status: string;
      turmas: { codigo: string; programas: { nome: string } | null } | null;
    } | null;

    if (!hist) {
      return (
        <div>
          <ScreenTitle>Hoje</ScreenTitle>
          <div className="mt-6">
            <EmptyState titulo="Sua jornada ainda não começou">
              Assim que você entrar em uma turma, a missão de hoje aparece aqui. De pé, guerreiro.
            </EmptyState>
          </div>
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

    return (
      <div className="flex flex-col gap-6">
        <header>
          <Eyebrow>
            {hist.turmas?.programas?.nome} · Turma {hist.turmas?.codigo}
          </Eyebrow>
          <ScreenTitle className="mt-1">{concluida ? "Jornada concluída" : "Jornada encerrada"}</ScreenTitle>
          <div className="mt-2">
            <Tag tone={concluida ? "success" : "neutral"}>
              {concluida ? "🏁 Você foi até o fim." : "Encerrada"}
            </Tag>
          </div>
        </header>
        <div className="grid grid-cols-3 gap-3">
          <StatCard valor={ph.pontos_total ?? 0} rotulo="Pontos finais" />
          <StatCard valor={`${disc}%`} rotulo="Disciplina" />
          <StatCard valor={ph.nivel_atual ?? "—"} rotulo="Nível" />
        </div>
        <div className="flex flex-col gap-3">
          <ButtonLink href="/protocolo" variante="secondary">
            Histórico da jornada
          </ButtonLink>
          <div className="flex gap-3">
            <ButtonLink href="/ranking" variante="ghost" fullWidth={false}>
              Ranking
            </ButtonLink>
            <ButtonLink href="/certificado" variante="ghost" fullWidth={false}>
              Certificado
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Jornada ativa: tela "Hoje" ----------
  const programaId = m!.turmas!.programa_id;
  const { data: diaData } = await supabase.rpc("dia_corrente_turma", { p_turma: m!.turma_id });
  const dia = Number(diaData);
  const podeOperar = m!.turmas!.status === "ativa" && dia >= 1;

  const { data: paRow } = await supabase
    .from("pontuacao_agregada")
    .select("pontos_total, streak_atual, indice_disciplina, nivel_atual")
    .eq("matricula_id", m!.id)
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
    .eq("matricula_id", m!.id)
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
    .eq("matricula_id", m!.id)
    .maybeSingle();
  const posicao = (rkRow as { posicao: number } | null)?.posicao ?? null;

  return (
    <HojeView
      programaNome={m!.turmas!.programas?.nome ?? "Código 21"}
      turmaCodigo={m!.turmas!.codigo}
      dia={dia}
      duracao={m!.turmas!.programas?.duracao_dias ?? 21}
      faseNome={missao.programa_fases?.nome ?? null}
      missao={{
        titulo: missao.missao_titulo ?? "Missão do dia",
        descricao: missao.missao_descricao,
        pontos: missao.missao_pontos ?? 0,
      }}
      feito={!!ck}
      pontosDia={ck?.pontos_dia ?? 0}
      posicao={posicao}
      streak={pa.streak_atual ?? 0}
      indice={Number(pa.indice_disciplina ?? 0)}
      pontosTotal={pa.pontos_total ?? 0}
      nivel={pa.nivel_atual ?? "recruta"}
      podeOperar={podeOperar}
      habitos={habitos}
      cumpridos={cumpridos}
      missaoCompleta={ck?.missao_completa ?? false}
      publico={ck?.check_in_publico ?? false}
      ok={ok}
      erro={erro}
    />
  );
}
