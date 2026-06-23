import { jornadaContexto } from "@/lib/jornada/contexto";
import { ProtocoloTimeline } from "@/components/jornada";

export default async function ProtocoloPage() {
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
  const somenteLeitura = !ctx.ativa;

  const { supabase } = ctx;

  const { data: tRow } = await supabase
    .from("turmas")
    .select("programa_id, status, programas(nome, duracao_dias)")
    .eq("id", ref.turma_id)
    .maybeSingle();
  const t = tRow as unknown as {
    programa_id: string;
    status: string;
    programas: { nome: string; duracao_dias: number } | null;
  } | null;
  if (!t) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold">Protocolo</h1>
        <p className="mt-3 text-muted">Programa não encontrado.</p>
      </div>
    );
  }
  const turmaAtiva = t.status === "ativa";

  const { data: diaData } = await supabase.rpc("dia_corrente_turma", { p_turma: ref.turma_id });
  const dc = Number(diaData);

  const { data: diasData } = await supabase
    .from("protocolo_dias")
    .select("numero, titulo, missao_titulo, eh_marco, programa_fases(nome)")
    .eq("programa_id", t.programa_id)
    .order("numero");
  const diasRaw = (diasData ?? []) as unknown as {
    numero: number;
    titulo: string | null;
    missao_titulo: string;
    eh_marco: boolean;
    programa_fases: { nome: string } | null;
  }[];

  const { data: ckData } = await supabase
    .from("checkins")
    .select("dia_numero")
    .eq("matricula_id", ref.id);
  const feitos = new Set(((ckData ?? []) as { dia_numero: number }[]).map((c) => c.dia_numero));

  const dias = diasRaw.map((d) => {
    let status: string;
    // "bloqueado"/"hoje" só fazem sentido em turma ativa; encerrada → concluído/perdido.
    if (turmaAtiva && d.numero > dc) status = "bloqueado";
    else if (turmaAtiva && d.numero === dc) status = "hoje";
    else status = feitos.has(d.numero) ? "concluido" : "perdido";
    return {
      numero: d.numero,
      fase: d.programa_fases?.nome ?? null,
      titulo: d.titulo,
      missaoTitulo: d.missao_titulo,
      ehMarco: d.eh_marco,
      status,
    };
  });

  const concluidos = dias.filter((d) => d.status === "concluido").length;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">
        {t.programas?.nome} · Protocolo
      </h1>
      {somenteLeitura ? (
        <p className="mb-4 mt-1 inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-sm text-gold">
          📖 Jornada encerrada — histórico (somente leitura) · {concluidos}/
          {t.programas?.duracao_dias} dias concluídos
        </p>
      ) : (
        <p className="mb-4 mt-1 text-sm text-subtle">
          Dia atual: {dc} de {t.programas?.duracao_dias}
        </p>
      )}
      <ProtocoloTimeline dias={dias} />
    </div>
  );
}
