-- ============================================================================
-- Código 21 — Migration 0006: Scoring Engine (Bloco Jornada, FASE 1)
-- Pré-req: 0001–0005. Funções de dia corrente, índice, recálculo de check-in
-- e de pontuação agregada + triggers. Idempotente.
-- Regras: streak = PRESENÇA (faltou = zera); nível MONOTÔNICO; índice 60/25/15
-- (pesos via app_settings, fallback embutido); dia perfeito = 10/10 hábitos.
-- ============================================================================

-- ordem do nível (para monotonicidade)
create or replace function nivel_rank(n nivel) returns int language sql immutable as $$
  select case n when 'recruta' then 0 when 'sobrevivente' then 1
                when 'guerreiro' then 2 when 'guerreiro_formado' then 3 end
$$;

-- dia da jornada para um instante arbitrário (PURO/testável)
create or replace function dia_corrente_em(p_turma uuid, p_now timestamptz) returns int
  language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_start timestamptz; v_tz text; v_dur int; v_d int;
begin
  select t.starts_at, t.timezone, pr.duracao_dias
    into v_start, v_tz, v_dur
    from turmas t join programas pr on pr.id = t.programa_id
    where t.id = p_turma;
  if v_start is null then return 0; end if;
  v_d := ((p_now at time zone v_tz)::date - (v_start at time zone v_tz)::date) + 1;
  if v_d < 0 then v_d := 0; end if;
  if v_d > v_dur then v_d := v_dur; end if;
  return v_d;
end; $$;

create or replace function dia_corrente_turma(p_turma uuid) returns int
  language sql stable security definer set search_path = public, pg_temp as $$
  select dia_corrente_em(p_turma, now())
$$;

-- Índice de Disciplina (0–100%) sobre p_dias dias (corrente ou final)
create or replace function calcular_indice(p_matricula uuid, p_dias int) returns numeric
  language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_prog uuid; v_total_hab int; v_hab int; v_mis int; v_dp int;
        wh numeric := 60; wm numeric := 25; wdp numeric := 15; v_pesos jsonb; d int;
begin
  d := greatest(p_dias, 1);
  select t.programa_id into v_prog
    from matriculas m join turmas t on t.id = m.turma_id where m.id = p_matricula;
  select count(*) into v_total_hab from habitos_definicao where programa_id = v_prog;
  if v_total_hab = 0 then v_total_hab := 10; end if;
  select count(*) filter (where ch.cumprido) into v_hab
    from checkins c join checkin_habitos ch on ch.checkin_id = c.id
    where c.matricula_id = p_matricula;
  select count(*) filter (where missao_completa), count(*) filter (where dia_perfeito)
    into v_mis, v_dp from checkins where matricula_id = p_matricula;
  select value into v_pesos from app_settings where scope_type = 'global' and key = 'indice_pesos';
  if v_pesos is not null then
    wh := coalesce((v_pesos->>'habitos')::numeric, 60);
    wm := coalesce((v_pesos->>'missoes')::numeric, 25);
    wdp := coalesce((v_pesos->>'dias_perfeitos')::numeric, 15);
  end if;
  return least(100, round(
      (v_hab::numeric / nullif(v_total_hab * d, 0)) * wh
    + (v_mis::numeric / nullif(d, 0)) * wm
    + (v_dp::numeric  / nullif(d, 0)) * wdp, 2));
end; $$;

-- recalcula pontos_dia + dia_perfeito de UM check-in
create or replace function recalc_checkin(p_checkin uuid) returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
declare v_mat uuid; v_prog uuid; v_dia int; v_missao_ok boolean;
        v_total_hab int; v_cumpridos int; v_pontos int; v_bonus int;
        v_missao_pts int; v_perfeito boolean;
begin
  select matricula_id, dia_numero, missao_completa into v_mat, v_dia, v_missao_ok
    from checkins where id = p_checkin;
  if v_mat is null then return; end if;
  select t.programa_id into v_prog
    from matriculas m join turmas t on t.id = m.turma_id where m.id = v_mat;
  select count(*) into v_total_hab from habitos_definicao where programa_id = v_prog;
  select coalesce(sum(h.pontos) filter (where ch.cumprido), 0),
         count(*) filter (where ch.cumprido)
    into v_pontos, v_cumpridos
    from checkin_habitos ch join habitos_definicao h on h.id = ch.habito_id
    where ch.checkin_id = p_checkin;
  v_perfeito := (v_total_hab > 0 and v_cumpridos = v_total_hab);
  v_bonus := coalesce((select (value->>'dia_perfeito_bonus')::int
                       from app_settings where scope_type = 'global' and key = 'pontuacao'), 25);
  if v_perfeito then v_pontos := v_pontos + v_bonus; end if;
  if v_missao_ok then
    select coalesce(missao_pontos, 0) into v_missao_pts
      from protocolo_dias where programa_id = v_prog and numero = v_dia;
    v_pontos := v_pontos + coalesce(v_missao_pts, 0);
  end if;
  update checkins set pontos_dia = v_pontos, dia_perfeito = v_perfeito where id = p_checkin;
end; $$;

-- recalcula a pontuação AGREGADA da matrícula
create or replace function recalc_pontuacao(p_matricula uuid) returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
declare v_turma uuid; v_D int; v_total int; v_completos int; v_perfeitos int;
        v_indice numeric; v_streak int := 0; v_rec int; v_cand nivel; v_atual nivel;
        v_ref int; d int;
begin
  select turma_id into v_turma from matriculas where id = p_matricula;
  if v_turma is null then return; end if;
  v_D := greatest(dia_corrente_turma(v_turma), 1);

  select coalesce(sum(pontos_dia), 0), count(*), count(*) filter (where dia_perfeito)
    into v_total, v_completos, v_perfeitos
    from checkins where matricula_id = p_matricula;

  v_indice := calcular_indice(p_matricula, v_D);

  -- streak de PRESENÇA: dias consecutivos com check-in terminando em D (ou D-1 se hoje vazio)
  v_ref := case when exists (select 1 from checkins where matricula_id = p_matricula and dia_numero = v_D)
                then v_D else v_D - 1 end;
  d := v_ref;
  while d >= 1 loop
    if exists (select 1 from checkins where matricula_id = p_matricula and dia_numero = d) then
      v_streak := v_streak + 1; d := d - 1;
    else exit; end if;
  end loop;

  select nivel_atual, streak_recorde into v_atual, v_rec
    from pontuacao_agregada where matricula_id = p_matricula;
  v_cand := case when v_indice >= 80 and v_completos >= 8 then 'guerreiro'
                 when v_indice >= 50 and v_completos >= 4 then 'sobrevivente'
                 else 'recruta' end;
  -- monotônico: nunca regride
  if nivel_rank(v_cand) < nivel_rank(coalesce(v_atual, 'recruta')) then v_cand := v_atual; end if;
  v_rec := greatest(coalesce(v_rec, 0), v_streak);

  insert into pontuacao_agregada (matricula_id, pontos_total, streak_atual, streak_recorde,
                                  dias_completos, dias_perfeitos, indice_disciplina, nivel_atual, atualizado_at)
  values (p_matricula, v_total, v_streak, v_rec, v_completos, v_perfeitos, coalesce(v_indice, 0), v_cand, now())
  on conflict (matricula_id) do update set
    pontos_total = excluded.pontos_total, streak_atual = excluded.streak_atual,
    streak_recorde = excluded.streak_recorde, dias_completos = excluded.dias_completos,
    dias_perfeitos = excluded.dias_perfeitos, indice_disciplina = excluded.indice_disciplina,
    nivel_atual = excluded.nivel_atual, atualizado_at = now();
end; $$;

-- ===================== TRIGGERS (guarda pg_trigger_depth contra recursão) ====
create or replace function tg_after_checkin() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;  -- evita loop quando recalc_checkin faz UPDATE
  perform recalc_checkin(new.id);
  perform recalc_pontuacao(new.matricula_id);
  return null;
end; $$;
drop trigger if exists trg_after_checkin on checkins;
create trigger trg_after_checkin after insert or update on checkins
  for each row execute function tg_after_checkin();

create or replace function tg_after_checkin_habito() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
declare v_checkin uuid; v_mat uuid;
begin
  v_checkin := coalesce(new.checkin_id, old.checkin_id);
  select matricula_id into v_mat from checkins where id = v_checkin;
  perform recalc_checkin(v_checkin);
  perform recalc_pontuacao(v_mat);
  return null;
end; $$;
drop trigger if exists trg_after_checkin_habito on checkin_habitos;
create trigger trg_after_checkin_habito after insert or update or delete on checkin_habitos
  for each row execute function tg_after_checkin_habito();
