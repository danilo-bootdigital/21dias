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
 * Template do e-mail "Bem-vindo ao CÓDIGO 21" (convite de matrícula).
 * HTML responsivo (≤600px), identidade dark + dourado, compatível com
 * Gmail/Outlook (layout em tabela + estilos inline + botão à prova de Outlook).
 * Retorna também a versão texto/plain (fallback).
 */
export function conviteMatriculaTemplate(d: {
  nome: string;
  programa: string;
  email: string;
  urlAcesso: string;
}): { subject: string; html: string; text: string } {
  const subject = "Bem-vindo ao CÓDIGO 21";

  const text = `Olá, ${d.nome}.

Você foi matriculado com sucesso no programa ${d.programa}.

Seu acesso à plataforma já está disponível.

Para entrar, utilize o e-mail:
${d.email}

Acesse a plataforma pelo link abaixo:
${d.urlAcesso}

Caso ainda não possua senha, clique em "Esqueci minha senha" na tela de login para criar uma nova senha através do seu e-mail.

Nos vemos dentro da plataforma.

Equipe CÓDIGO 21`;

  const nome = esc(d.nome);
  const programa = esc(d.programa);
  const email = esc(d.email);
  const url = esc(d.urlAcesso);

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
    <h1 style="margin:0;font-size:24px;line-height:1.25;color:#F6F2EA;font-weight:bold;">Bem-vindo ao CÓDIGO 21</h1>
  </td></tr>
  <tr><td style="padding:18px 32px 0 32px;color:#C7C1B4;font-size:16px;line-height:1.6;">
    <p style="margin:0 0 14px 0;">Olá, <strong style="color:#F6F2EA;">${nome}</strong>.</p>
    <p style="margin:0 0 14px 0;">Você foi matriculado com sucesso no programa <strong style="color:#F6F2EA;">${programa}</strong>.</p>
    <p style="margin:0 0 14px 0;">Seu acesso à plataforma já está disponível. Para entrar, utilize o e-mail:</p>
    <p style="margin:0 0 18px 0;color:#E4C77E;font-weight:bold;font-size:16px;">${email}</p>
  </td></tr>
  <tr><td align="center" style="padding:8px 32px 4px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr><td align="center" bgcolor="#C8A45D" style="border-radius:12px;">
        <a href="${url}" target="_blank"
           style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#0D0D0D;text-decoration:none;border-radius:12px;">
          Acessar Plataforma
        </a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:18px 32px 0 32px;color:#8C8578;font-size:13px;line-height:1.6;">
    <p style="margin:0 0 12px 0;">Ou acesse: <a href="${url}" target="_blank" style="color:#C8A45D;">${url}</a></p>
    <p style="margin:0;">Caso ainda não possua senha, clique em <strong style="color:#C7C1B4;">"Esqueci minha senha"</strong> na tela de login para criar uma nova senha através do seu e-mail.</p>
  </td></tr>
  <tr><td style="padding:22px 32px 28px 32px;border-top:1px solid #2A2824;color:#C7C1B4;font-size:14px;line-height:1.6;">
    <p style="margin:18px 0 2px 0;">Nos vemos dentro da plataforma.</p>
    <p style="margin:0;color:#C8A45D;font-weight:bold;">Equipe CÓDIGO 21</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}
