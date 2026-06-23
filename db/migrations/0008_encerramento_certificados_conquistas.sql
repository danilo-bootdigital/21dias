-- ============================================================================
-- Código 21 — Migration 0008: Encerramento + Certificados + Conquistas
-- Pré-req: 0001–0007. Função encerrar_turma ATÔMICA + IDEMPOTENTE + AUDITADA.
-- Não altera RLS, pontuação nem ranking.
-- ============================================================================

-- seed das conquistas (idempotente)
insert into conquistas_definicao (codigo, nome, descricao, raridade) values
  ('guerreiro_formado',   'Guerreiro Formado',    'Concluiu a jornada do programa.',                       'rara'),
  ('guerreiro_implacavel','Guerreiro Implacável', '100% dos dias completos e 100% dos dias perfeitos.',    'lendaria')
on conflict (codigo) do nothing;

create or replace function encerrar_turma(p_turma uuid, p_actor uuid default null) returns jsonb
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_status turma_status; v_dur int; v_temporada uuid;
  v_cid_formado uuid; v_cid_impl uuid;
  v_count int := 0; v_impl int := 0;
  r record; v_indice numeric; v_nivel nivel;
begin
  -- 1. validar + BLOQUEAR a turma (FOR UPDATE)
  select status into v_status from turmas where id = p_turma for update;
  if v_status is null then
    return jsonb_build_object('status', 'inexistente');
  end if;
  -- 2. no-op se não estiver ativa (idempotência: re-run de turma encerrada cai aqui)
  if v_status <> 'ativa' then
    return jsonb_build_object('status', 'no-op', 'motivo', 'turma nao ativa: ' || v_status);
  end if;

  select pr.duracao_dias, pr.temporada_id into v_dur, v_temporada
    from turmas t join programas pr on pr.id = t.programa_id where t.id = p_turma;
  select id into v_cid_formado from conquistas_definicao where codigo = 'guerreiro_formado';
  select id into v_cid_impl    from conquistas_definicao where codigo = 'guerreiro_implacavel';

  -- 3–9. por matrícula ativa: índice final → nível → congelar → concluir →
  --      certificado → guerreiro_formado → (implacável se 100%/100%)
  for r in
    select m.id as mid, m.user_id,
           coalesce(pa.dias_completos, 0) as dias_completos,
           coalesce(pa.dias_perfeitos, 0) as dias_perfeitos,
           coalesce(pa.nivel_atual, 'recruta') as nivel_atual
    from matriculas m
    left join pontuacao_agregada pa on pa.matricula_id = m.id
    where m.turma_id = p_turma and m.status = 'ativa'
  loop
    v_indice := calcular_indice(r.mid, v_dur);                 -- 3 (índice final)
    v_nivel := case when v_indice >= 80 and r.dias_completos >= 8 then 'guerreiro'
                    when v_indice >= 50 and r.dias_completos >= 4 then 'sobrevivente'
                    else 'recruta' end;
    if nivel_rank(v_nivel) < nivel_rank(r.nivel_atual) then v_nivel := r.nivel_atual; end if;

    update pontuacao_agregada                                  -- 4 (congelar)
      set disciplina_final = v_indice, nivel_atual = v_nivel, atualizado_at = now()
      where matricula_id = r.mid;

    update matriculas set status = 'concluida' where id = r.mid;  -- 5 (concluir)

    insert into certificados (matricula_id, nivel_final, disciplina_final)  -- 6
      values (r.mid, v_nivel, v_indice)
      on conflict (matricula_id) do nothing;

    insert into conquistas_usuario (user_id, conquista_id, matricula_id, temporada_id)  -- 8
      values (r.user_id, v_cid_formado, r.mid, v_temporada)
      on conflict (user_id, conquista_id, matricula_id) do nothing;

    if r.dias_completos = v_dur and r.dias_perfeitos = v_dur then  -- 9
      insert into conquistas_usuario (user_id, conquista_id, matricula_id, temporada_id)
        values (r.user_id, v_cid_impl, r.mid, v_temporada)
        on conflict (user_id, conquista_id, matricula_id) do nothing;
      v_impl := v_impl + 1;
    end if;
    v_count := v_count + 1;
  end loop;

  -- 7. hall (ranking final por pontos_total; após conclusões)
  insert into hall_entries (turma_id, matricula_id, posicao, nivel_final, disciplina_final)
  select p_turma, x.mid, x.pos, c.nivel_final, c.disciplina_final
  from (
    select pa.matricula_id as mid, rank() over (order by pa.pontos_total desc) as pos
    from pontuacao_agregada pa join matriculas m on m.id = pa.matricula_id
    where m.turma_id = p_turma and m.status = 'concluida'
  ) x
  join certificados c on c.matricula_id = x.mid
  on conflict (turma_id, matricula_id) do nothing;

  -- 10. turma encerrada
  update turmas set status = 'encerrada' where id = p_turma;

  -- 11. auditoria (actor null = sistema/cron; preenchido = admin)
  insert into audit_log (actor_id, acao, alvo, meta)
  values (p_actor, 'turma_encerrada', 'turma:' || p_turma,
          jsonb_build_object('origem', case when p_actor is null then 'sistema' else 'admin' end,
                             'matriculas_concluidas', v_count, 'certificados', v_count,
                             'implacaveis', v_impl));

  return jsonb_build_object('status', 'encerrada', 'matriculas_concluidas', v_count, 'implacaveis', v_impl);
end; $$;
