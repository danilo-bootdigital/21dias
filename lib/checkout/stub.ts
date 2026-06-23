import "server-only";
import type { CheckoutAdapter, NormalizedCheckoutEvent } from "./types";

/**
 * Adapter STUB — verificação por segredo compartilhado no header `x-webhook-secret`.
 * Provedores reais (Kiwify/Hotmart/Stripe) entram como novos adapters, sem mexer
 * no resto (o webhook só conhece a interface CheckoutAdapter).
 *
 * Payload esperado (JSON):
 *   { external_id, email, programa_id, turma_id?, valor_cents?, tipo: "paid"|"refunded" }
 */
export const stubAdapter: CheckoutAdapter = {
  verify(_rawBody, headers) {
    const secret = process.env.CHECKOUT_WEBHOOK_SECRET;
    if (!secret) return false;
    return headers.get("x-webhook-secret") === secret;
  },

  parse(rawBody) {
    try {
      const b = JSON.parse(rawBody);
      if (!b.external_id || !b.email || !b.programa_id || !b.tipo) return null;
      const ev: NormalizedCheckoutEvent = {
        provider: "stub",
        externalId: String(b.external_id),
        email: String(b.email).toLowerCase(),
        programaId: String(b.programa_id),
        turmaId: b.turma_id ?? null,
        valorCents: typeof b.valor_cents === "number" ? b.valor_cents : null,
        tipo: b.tipo === "refunded" ? "refunded" : "paid",
      };
      return ev;
    } catch {
      return null;
    }
  },
};
