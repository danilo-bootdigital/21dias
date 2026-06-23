// Contrato do adapter de checkout (plugável). O webhook normaliza o payload do
// provedor real para este formato antes de tocar no banco.

export type CheckoutEventType = "paid" | "refunded";

export interface NormalizedCheckoutEvent {
  provider: string;
  externalId: string;
  email: string;
  programaId: string;
  turmaId?: string | null; // turma pretendida (opcional)
  valorCents?: number | null;
  tipo: CheckoutEventType;
}

export interface CheckoutAdapter {
  /** Verifica a autenticidade do webhook (assinatura/segredo). */
  verify(rawBody: string, headers: Headers): boolean;
  /** Converte o corpo cru no evento normalizado, ou null se inválido. */
  parse(rawBody: string): NormalizedCheckoutEvent | null;
}
