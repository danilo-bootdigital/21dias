import "server-only";

/**
 * Camada ÚNICA e reutilizável de envio de e-mail da plataforma (server-only).
 * Provedor: Resend (HTTP API) — trocar de provedor = trocar só esta função.
 *
 * Secrets ficam SOMENTE no servidor (RESEND_API_KEY, EMAIL_FROM). Nunca usar
 * NEXT_PUBLIC_* aqui — isso vazaria a chave para o front-end. Sem chave
 * configurada, vira no-op controlado (ok:false) e NUNCA lança exceção, para
 * jamais bloquear o fluxo de negócio que chamou.
 */
export type EmailInput = { to: string; subject: string; html: string; text: string };
export type EmailResult = { ok: true; id?: string } | { ok: false; error: string };

export async function enviarEmail({ to, subject, html, text }: EmailInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "CÓDIGO 21 <nao-responder@codigo21.com.br>";
  if (!apiKey) return { ok: false, error: "email_nao_configurado" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    if (!res.ok) {
      const detalhe = await res.text().catch(() => "");
      return { ok: false, error: `resend_${res.status}:${detalhe.slice(0, 180)}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "erro_desconhecido" };
  }
}
