-- ============================================================================
-- Código 21 — Migration 0007: Ranking Views (Bloco Jornada, FASE 2)
-- Pré-req: 0001–0006. Três views com security_invoker = true (respeitam RLS).
--
-- Visibilidade: a base de TODAS as views é pontuacao_agregada, cuja RLS
-- (pontuacao_read = can_view_historical_matricula) já expõe SÓ a própria turma
-- (próprio + colegas ativos/concluídos) + staff. Assim o ranking não vaza entre
-- turmas. turma_id e pontos da semana vêm de helpers SECURITY DEFINER que
-- AUTO-GATEIAM por can_view_historical_matricula (sem expor outras turmas).
-- ============================================================================

-- turma da matrícula (gated): só resolve se o chamador pode ver a matrícula
create or replace function matricula_turma(p_matricula uuid) returns uuid
  language sql stable security definer set search_path = public, pg_temp as $$
  select case when can_view_historical_matricula(p_matricula)
              then (select turma_id from matriculas where id = p_matricula) end
$$;

-- pontos da semana corrente (gated)
create or replace function pontos_semana(p_matricula uuid) returns int
  language sql stable security definer set search_path = public, pg_temp as $$
  select case when can_view_historical_matricula(p_matricula) then
    coalesce((select sum(pontos_dia)::int from checkins
              where matricula_id = p_matricula
                and data >= date_trunc('week', current_date)::date), 0)
  end
$$;

create or replace view ranking_geral with (security_invoker = true) as
  select p.matricula_id,
         matricula_turma(p.matricula_id) as turma_id,
         p.pontos_total,
         rank() over (partition by matricula_turma(p.matricula_id)
                      order by p.pontos_total desc) as posicao
  from pontuacao_agregada p;

create or replace view ranking_presenca with (security_invoker = true) as
  select p.matricula_id,
         matricula_turma(p.matricula_id) as turma_id,
         p.streak_atual,
         rank() over (partition by matricula_turma(p.matricula_id)
                      order by p.streak_atual desc) as posicao
  from pontuacao_agregada p;

create or replace view ranking_semanal with (security_invoker = true) as
  select p.matricula_id,
         matricula_turma(p.matricula_id) as turma_id,
         pontos_semana(p.matricula_id) as pontos_semana,
         rank() over (partition by matricula_turma(p.matricula_id)
                      order by pontos_semana(p.matricula_id) desc) as posicao
  from pontuacao_agregada p;

grant select on ranking_geral, ranking_semanal, ranking_presenca to authenticated;
