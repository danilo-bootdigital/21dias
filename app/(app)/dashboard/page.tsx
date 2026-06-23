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

  if (!m) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        <p className="mt-3 text-muted">Você não tem uma jornada ativa no momento.</p>
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
          .select("missao_titulo, missao_descricao, missao_pontos")
          .eq("programa_id", programaId)
          .eq("numero", dia)
          .maybeSingle()
      : { data: null };
  const missao = (missaoRow ?? {}) as {
    missao_titulo?: string;
    missao_descricao?: string;
    missao_pontos?: number;
  };

  const { data: habsRow } = await supabase
    .from("habitos_definicao")
    .select("id, nome")
    .eq("programa_id", programaId)
    .order("ordem");
  const habitos = (habsRow ?? []) as { id: string; nome: string }[];

  const { data: ckRow } = await supabase
    .from("checkins")
    .select("id, missao_completa, check_in_publico")
    .eq("matricula_id", m.id)
    .eq("dia_numero", dia >= 1 ? dia : -1)
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
      <h1 className="font-display text-3xl font-semibold">
        {m.turmas!.programas?.nome} · Turma {m.turmas!.codigo}
      </h1>
      <p className="mb-4 mt-1 text-sm text-subtle">
        Dia {dia} de {m.turmas!.programas?.duracao_dias}
      </p>
      <Aviso ok={ok === "checkin" ? "Check-in salvo." : ok} erro={erro} />

      <IndicadoresHeader
        streak={pa.streak_atual ?? 0}
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

      <h2 className="mb-2 text-sm uppercase tracking-wider text-subtle">Os 10 inegociáveis</h2>
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
