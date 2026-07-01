import "server-only";

/** Escapa valores dinâmicos para uso seguro no HTML do e-mail. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Template do e-mail "Redefinição de senha" (link enviado pelo admin a partir
 * da ficha do Guerreiro). Mesma identidade visual do convite. O link já aponta
 * para produção e leva o próprio Guerreiro a criar a nova senha — o admin nunca
 * vê nem define a senha. Retorna também a versão texto/plain (fallback).
 */
export function resetSenhaTemplate(d: {
  nome: string;
  link: string;
}): { subject: string; html: string; text: string } {
  const subject = "Redefinição de senha — CÓDIGO 21";

  const text = `Olá, ${d.nome}.

Recebemos um pedido para redefinir a senha da sua conta no CÓDIGO 21.

Para criar uma nova senha, acesse o link abaixo:
${d.link}

Por segurança, este link expira em algumas horas e só pode ser usado uma vez.

Se você não solicitou a redefinição, ignore este e-mail — sua senha atual continua válida.

Equipe CÓDIGO 21`;

  const nome = esc(d.nome);
  const link = esc(d.link);

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0D0D0D;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0D0D;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#161513;border:1px solid #2A2824;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
  <tr><td style="padding:28px 32px 8px 32px;">
    <p style="margin:0;font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#C8A45D;font-weight:bold;">CÓDIGO 21</p>
  </td></tr>
  <tr><td style="padding:8px 32px 0 32px;">
    <h1 style="margin:0;font-size:24px;line-height:1.25;color:#F6F2EA;font-weight:bold;">Redefinição de senha</h1>
  </td></tr>
  <tr><td style="padding:18px 32px 0 32px;color:#C7C1B4;font-size:16px;line-height:1.6;">
    <p style="margin:0 0 14px 0;">Olá, <strong style="color:#F6F2EA;">${nome}</strong>.</p>
    <p style="margin:0 0 18px 0;">Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.</p>
  </td></tr>
  <tr><td align="center" style="padding:8px 32px 4px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr><td align="center" bgcolor="#C8A45D" style="border-radius:12px;">
        <a href="${link}" target="_blank"
           style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#0D0D0D;text-decoration:none;border-radius:12px;">
          Criar nova senha
        </a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:18px 32px 0 32px;color:#8C8578;font-size:13px;line-height:1.6;">
    <p style="margin:0 0 12px 0;">Ou acesse: <a href="${link}" target="_blank" style="color:#C8A45D;">${link}</a></p>
    <p style="margin:0;">Por segurança, este link expira em algumas horas e só pode ser usado uma vez. Se você não solicitou a redefinição, ignore este e-mail — sua senha atual continua válida.</p>
  </td></tr>
  <tr><td style="padding:22px 32px 28px 32px;border-top:1px solid #2A2824;color:#C8A45D;font-size:14px;line-height:1.6;font-weight:bold;">
    <p style="margin:18px 0 0 0;">Equipe CÓDIGO 21</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}
