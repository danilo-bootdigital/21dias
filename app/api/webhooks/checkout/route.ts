import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCheckoutAdapter } from "@/lib/checkout";

/**
 * Webhook de checkout (CAMINHO 1 — compra externa). Idempotente por
 * (provider, external_id). Grava via SERVICE ROLE (ignora RLS).
 * `paid`  → upsert entitlement(origem=compra); se usuário existe e há turma,
 *           vincula e cria matrícula (sem reativar cancelada).
 * `refunded` → entitlement 'reembolsado' + matrícula 'cancelada' (revoga acesso).
 */
export async function POST(request: NextRequest) {
  const raw = await request.text(); // corpo CRU (necessário p/ assinatura)
  const adapter = getCheckoutAdapter();

  if (!adapter.verify(raw, request.headers)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }
  const evt = adapter.parse(raw);
  if (!evt) return NextResponse.json({ error: "payload inválido" }, { status: 400 });

  const admin = createAdminSupabase();

  if (evt.tipo === "paid") {
    const { data: entRow, error } = await admin
      .from("entitlements")
      .upsert(
        {
          provider: evt.provider,
          external_id: evt.externalId,
          email: evt.email,
          programa_id: evt.programaId,
          turma_id: evt.turmaId ?? null,
          valor_cents: evt.valorCents ?? null,
          origem: "compra",
          status: "ativo",
          paid_at: new Date().toISOString(),
        },
        { onConflict: "provider,external_id" },
      )
      .select("id, turma_id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ent = entRow as { id: string; turma_id: string | null };
    if (ent.turma_id) {
      const { data: uRow } = await admin
        .from("users")
        .select("id")
        .eq("email", evt.email)
        .maybeSingle();
      const u = uRow as { id: string } | null;
      if (u) {
        await admin.from("entitlements").update({ user_id: u.id }).eq("id", ent.id);
        // ignoreDuplicates => não reativa matrícula cancelada existente
        await admin
          .from("matriculas")
          .upsert(
            { user_id: u.id, turma_id: ent.turma_id, entitlement_id: ent.id, status: "ativa" },
            { onConflict: "user_id,turma_id", ignoreDuplicates: true },
          );
      }
    }
    return NextResponse.json({ ok: true });
  }

  // refunded
  const { data: entRow, error } = await admin
    .from("entitlements")
    .update({ status: "reembolsado", refunded_at: new Date().toISOString() })
    .eq("provider", evt.provider)
    .eq("external_id", evt.externalId)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ent = entRow as { id: string } | null;
  if (ent) {
    await admin.from("matriculas").update({ status: "cancelada" }).eq("entitlement_id", ent.id);
  }
  return NextResponse.json({ ok: true });
}
