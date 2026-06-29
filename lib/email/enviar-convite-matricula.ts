import "server-only";
import { enviarEmail } from "./client";
import { conviteMatriculaTemplate } from "./templates/convite-matricula";

/**
 * Serviço isolado: envia o e-mail de convite após uma matrícula manual.
 * Recebe os dados mínimos e delega ao cliente de e-mail. Nunca lança — retorna
 * { ok, error } para que a operação principal (matrícula) decida a mensagem.
 * `matriculaId`/`usuarioId` integram o payload mínimo e servem de contexto de log.
 */
export async function enviarConviteMatricula(input: {
  nome: string;
  email: string;
  programa: string;
  urlAcesso: string;
  matriculaId: string;
  usuarioId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { subject, html, text } = conviteMatriculaTemplate({
    nome: input.nome,
    programa: input.programa,
    email: input.email,
    urlAcesso: input.urlAcesso,
  });
  const r = await enviarEmail({ to: input.email, subject, html, text });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}
