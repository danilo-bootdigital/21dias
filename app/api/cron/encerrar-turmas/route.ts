import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const recebido = request.headers.get("authorization") ?? "";
  const esperado = `Bearer ${secret}`;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false; // timingSafeEqual exige mesmo tamanho
  return timingSafeEqual(a, b);
}

/**
 * Dias-calendário decorridos desde starts_at, NO FUSO DA TURMA (mesma lógica
 * de dia_corrente_em em 0006, porém sem o cap em duracao_dias — precisamos
 * distinguir "no último dia" de "depois do último dia").
 * Dia 1 = data de início (decorridos 0). A janela de N dias termina quando
 * os dias decorridos >= N (ou seja, já entramos no dia N+1).
 */
function diasDecorridosNoFuso(startsAt: string, tz: string, agora: Date): number {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const asUTCDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const inicio = asUTCDate(fmt.format(new Date(startsAt)));
  const hoje = asUTCDate(fmt.format(agora));
  return Math.round((hoje - inicio) / 86_400_000);
}

/**
 * Vercel Cron → encerra turmas ativas cuja janela terminou.
 * Protegida por Authorization: Bearer CRON_SECRET (comparação de tempo constante).
 * Usa SERVICE ROLE (server-only) e a função idempotente encerrar_turma.
 * Janela TZ-aware por turma; encerra só APÓS o último dia (decorridos >= duracao).
 */
export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("turmas")
    .select("id, starts_at, timezone, programas(duracao_dias)")
    .eq("status", "ativa")
    .not("starts_at", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const turmas = (data ?? []) as unknown as {
    id: string;
    starts_at: string;
    timezone: string | null;
    programas: { duracao_dias: number } | null;
  }[];

  const agora = new Date();
  let processadas = 0;
  const resultados: Record<string, unknown>[] = [];
  for (const t of turmas) {
    const dur = t.programas?.duracao_dias;
    // Sem fallback: duração inválida → não encerra, registra skip explícito.
    if (typeof dur !== "number" || !Number.isFinite(dur) || dur < 1) {
      resultados.push({ turma: t.id, skip: "duracao_dias_invalida" });
      continue;
    }
    const tz = t.timezone ?? "America/Sao_Paulo";
    const decorridos = diasDecorridosNoFuso(t.starts_at, tz, agora);
    if (decorridos < dur) continue; // ainda dentro da janela (inclui o último dia)
    const { data: r, error: e } = await admin.rpc("encerrar_turma", {
      p_turma: t.id,
      p_actor: null,
    });
    processadas += 1;
    resultados.push({ turma: t.id, resultado: e ? { erro: e.message } : r });
  }

  return NextResponse.json({ processadas, resultados });
}
