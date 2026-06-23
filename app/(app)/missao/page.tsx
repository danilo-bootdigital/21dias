import Link from "next/link";
import { jornadaContexto } from "@/lib/jornada/contexto";
import { MissaoCard } from "@/components/jornada";

export default async function MissaoPage() {
  const ctx = await jornadaContexto();
  if (!ctx || !ctx.ativa) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold">Missão do dia</h1>
        <p className="mt-3 text-muted">Você não tem uma jornada ativa no momento.</p>
      </div>
    );
  }

  const { supabase, ativa } = ctx;

  const { data: tRow } = await supabase
    .from("turmas")
    .select("programa_id, status")
    .eq("id", ativa.turma_id)
    .maybeSingle();
  const turma = tRow as { programa_id: string; status: string } | null;
  const programaId = turma?.programa_id ?? "";

  const { data: diaData } = await supabase.rpc("dia_corrente_turma", { p_turma: ativa.turma_id });
  const dia = Number(diaData);

  if (!(dia >= 1)) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold">Missão do dia</h1>
        <p className="mt-3 text-muted">A jornada ainda não começou. Volte no Dia 1.</p>
      </div>
    );
  }

  const { data: missaoRow } = await supabase
    .from("protocolo_dias")
    .select("numero, missao_titulo, missao_descricao, missao_pontos, programa_fases(nome)")
    .eq("programa_id", programaId)
    .eq("numero", dia)
    .maybeSingle();
  const missao = (missaoRow ?? {}) as unknown as {
    numero?: number;
    missao_titulo?: string;
    missao_descricao?: string;
    missao_pontos?: number;
    programa_fases?: { nome: string } | null;
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Missão do dia</h1>
      <p className="mb-4 mt-1 text-sm text-subtle">
        Dia {dia} · Fase {missao.programa_fases?.nome ?? "—"}
      </p>
      <MissaoCard
        titulo={missao.missao_titulo ?? "—"}
        descricao={missao.missao_descricao}
        pontos={missao.missao_pontos ?? 0}
      />
      <p className="mt-4 text-sm text-subtle">
        Abra o dia completo (conteúdo + check-in) no{" "}
        <Link className="text-gold hover:underline" href={`/protocolo/${dia}`}>
          Protocolo
        </Link>
        .
      </p>
    </div>
  );
}
