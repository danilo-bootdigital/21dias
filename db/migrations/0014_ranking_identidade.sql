-- ============================================================================
-- Código 21 — Migration 0014: Identidade no Ranking da Turma (somente leitura)
-- ----------------------------------------------------------------------------
-- OBJETIVO: expor, para MEMBROS de uma turma, a identidade pública + nível +
-- índice de disciplina (+ pontos da semana) de cada matrícula, para que a tela
-- de Ranking possa mostrar foto, nome de guerreiro, medalha por nível e barra
-- de disciplina dos colegas — sem afrouxar a RLS de `matriculas`.
--
-- POR QUE UMA FUNÇÃO: as views ranking_* expõem só matricula_id + posição +
-- métrica (anônimo). A policy `matriculas_read` é própria-linha-apenas, então o
-- elo matricula_id → user_id dos colegas não é legível diretamente. Esta função
-- SECURITY DEFINER faz esse vínculo de forma SEGURA e GATED — mesmo padrão já
-- usado por matricula_turma()/pontos_semana()/shares_turma_with().
--
-- NÃO ALTERA NENHUMA REGRA DE RANKING: posições, métricas e ordenação continuam
-- vindo das views ranking_*; pontuação, nível e disciplina são apenas LIDOS de
-- pontuacao_agregada (calculados pelo scoring engine — intocado). É leitura.
--
-- Gate: só retorna linhas se o chamador for MEMBRO ativo/concluído da turma
-- (ou staff da turma). Caso contrário, retorna vazio.
-- ============================================================================

create or replace function ranking_turma(p_turma uuid)
returns table (
  matricula_id      uuid,
  nome_guerreiro    text,
  foto_url          text,
  nivel             nivel,
  indice_disciplina numeric,
  pontos_semana     int
)
language sql stable security definer set search_path = public, pg_temp as $$
  select
    m.id,
    gp.nome_guerreiro,
    gp.foto_url,
    pa.nivel_atual,
    pa.indice_disciplina,
    pontos_semana(m.id)
  from matriculas m
  join guerreiro_profiles gp on gp.user_id = m.user_id
  left join pontuacao_agregada pa on pa.matricula_id = m.id
  where m.turma_id = p_turma
    and m.status in ('ativa', 'concluida')
    and (
      is_staff_turma(p_turma)
      or exists (
        select 1 from matriculas me
        where me.user_id = current_user_id()
          and me.turma_id = p_turma
          and me.status in ('ativa', 'concluida')
      )
    );
$$;

grant execute on function ranking_turma(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- VERIFICAÇÃO (rodar logado como um guerreiro da turma; troque o uuid):
--   select * from ranking_turma('<turma_id>');
-- Esperado: uma linha por membro ativo/concluído da turma, com nome/foto/nível.
-- Logado como alguém de FORA da turma: 0 linhas (gate).
-- ----------------------------------------------------------------------------
