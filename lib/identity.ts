/**
 * IDENTIDADE PÚBLICA DO GUERREIRO — regra ÚNICA e definitiva (todo o sistema).
 *
 * Prioridade:
 *   1) guerreiro_profiles.nome_guerreiro  (nome escolhido no perfil)
 *   2) "Novo Guerreiro"                   (fallback amigável)
 *
 * O E-MAIL NUNCA é identidade pública e NUNCA é exibido na interface pública
 * (Ranking, Feed, Hall, Comunidade, Perfil público, Comentários, Conquistas,
 * Certificados). E-mail é dado de autenticação — pode aparecer apenas em:
 * Login, Recuperação de senha, Área administrativa e Configurações da conta.
 *
 * Use SEMPRE este helper ao renderizar o nome do Guerreiro em qualquer tela.
 */
export function nomeDeGuerreiro(nomeGuerreiro?: string | null): string {
  const nome = nomeGuerreiro?.trim();
  return nome ? nome : "Novo Guerreiro";
}
