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
 * Vercel Cron → encerra turmas ativas cuja janela terminou.
 * Protegida por Authorization: Bearer CRON_SECRET (comparação de tempo constante).
 * Usa SERVICE ROLE (server-only) e a função idempotente encerrar_turma.
 */
export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("turmas")
    .select("id, starts_at, programas(duracao_dias)")
    .eq("status", "ativa")
    .not("starts_at", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const turmas = (data ?? []) as unknown as {
    id: string;
    starts_at: string;
    programas: { duracao_dias: number } | null;
  }[];

  const agora = Date.now();
  const resultados: Record<string, unknown>[] = [];
  for (const t of turmas) {
    const dur = t.programas?.duracao_dias ?? 21;
    const fim = new Date(t.starts_at);
    fim.setDate(fim.getDate() + dur); // janela terminou?
    if (agora < fim.getTime()) continue;
    const { data: r, error: e } = await admin.rpc("encerrar_turma", {
      p_turma: t.id,
      p_actor: null,
    });
    resultados.push({ turma: t.id, resultado: e ? { erro: e.message } : r });
  }

  return NextResponse.json({ processadas: resultados.length, resultados });
}
