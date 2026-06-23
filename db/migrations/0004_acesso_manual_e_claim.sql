-- ============================================================================
-- Código 21 — Migration 0004: entitlement→programa, acesso manual, claim,
--             GAP A (operação × histórico). Pré-req: 0001, 0002, 0003. Idempotente.
--
-- MODELO DE ACESSO:
--   ativa     -> operação + área da turma + histórico próprio
--   concluida -> área da turma (leitura) + histórico próprio (sem operação)
--   cancelada -> SEM operação, SEM área da turma como membro,
--                MAS histórico próprio visível ao usuário (dados preservados)
--
-- REGRAS DOCUMENTADAS (implementação no bloco de Jornada/Encerramento):
--   * Conclusão: ao fim de (turma.starts_at + programa.duracao_dias) no TZ da turma,
--     o sistema encerra a turma e matrículas 'ativa'->'concluida' ('cancelada' fica).
--     Congela disciplina_final; emite certificado; calcula hall e conquistas.
--   * Certificado (MVP): toda matrícula 'concluida' recebe certificado exibindo
--     desempenho real (disciplina_final, nível, pontuação, turma, programa). Sem piso.
--   * Guerreiro Implacável: no encerramento; duracao_dias check-ins + dias perfeitos;
--     por matrícula; idempotente; não removido por cancelamento/reembolso (só admin).
--   * Transferência de turma (MVP): Opção B — altera matriculas.turma_id, mesmo
--     programa, destino sem conflito. Status 'transferida' fica para o futuro.
-- ============================================================================

-- ---------- enum origem + colunas de auditoria ----------
do $$ begin
  if not exists (select 1 from pg_type where typname='entitlement_origem') then
    create type entitlement_origem as enum ('compra','cortesia','convite','offline','interno','teste');
  end if;
end $$;

alter table entitlements add column if not exists origem entitlement_origem not null default 'compra';
alter table entitlements add column if not exists granted_by uuid references users(id) on delete set null;
alter table entitlements add column if not exists granted_reason text;
alter table entitlements alter column external_id set default gen_random_uuid()::text;

-- ---------- entitlement -> PROGRAMA; turma vira pretendida (opcional) ----------
alter table entitlements add column if not exists programa_id uuid references programas(id) on delete restrict;
update entitlements e set programa_id = t.programa_id
  from turmas t where t.id = e.turma_id and e.programa_id is null;   -- defensivo (tabela vazia)
alter table entitlements alter column programa_id set not null;
alter table entitlements alter column turma_id drop not null;
alter table entitlements drop constraint if exists entitlements_turma_id_fkey;
alter table entitlements add constraint entitlements_turma_id_fkey
  foreign key (turma_id) references turmas(id) on delete set null;
create index if not exists idx_entitlements_programa on entitlements(programa_id);

-- ---------- matriculas: rastreio da concessão ----------
alter table matriculas add column if not exists entitlement_id uuid references entitlements(id) on delete set null;
create index if not exists idx_matriculas_entitlement on matriculas(entitlement_id);

-- ---------- HELPERS: operação (só 'ativa') ----------
create or replace function is_active_member_turma(p_turma uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from matriculas m
    where m.user_id=current_user_id() and m.turma_id=p_turma and m.status='ativa') $$;

create or replace function my_active_turma_ids() returns setof uuid
  language sql stable security definer set search_path = public, pg_temp as $$
  select turma_id from matriculas where user_id=current_user_id() and status='ativa' $$;

create or replace function owns_active_matricula(p_matricula uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from matriculas m
    where m.id=p_matricula and m.user_id=current_user_id() and m.status='ativa') $$;

-- ---------- HELPERS: área da turma como membro (histórico = 'ativa'+'concluida') ----------
create or replace function my_historical_turma_ids() returns setof uuid
  language sql stable security definer set search_path = public, pg_temp as $$
  select turma_id from matriculas where user_id=current_user_id()
    and status in ('ativa','concluida') $$;

-- ---------- HELPER: histórico PRÓPRIO (qualquer status, inclui 'cancelada') ----------
create or replace function owns_any_matricula(p_matricula uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from matriculas m
    where m.id=p_matricula and m.user_id=current_user_id()) $$;

-- próprio (qualquer status) OU colega (sou membro ativo/concluído da turma) OU staff
create or replace function can_view_historical_matricula(p_matricula uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from matriculas m where m.id=p_matricula and (
      m.user_id=current_user_id()
      or m.turma_id in (select turma_id from matriculas
                        where user_id=current_user_id() and status in ('ativa','concluida'))
      or is_staff_turma(m.turma_id))) $$;

-- perfis de colegas (membros ativos/concluídos da mesma turma)
create or replace function shares_turma_with(p_user uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from matriculas m1 join matriculas m2 on m2.turma_id=m1.turma_id
    where m1.user_id=current_user_id() and m2.user_id=p_user
      and m1.status in ('ativa','concluida') and m2.status in ('ativa','concluida')) $$;

-- ---------- RECRIAR policies impactadas ----------
drop policy if exists turmas_read on turmas;
create policy turmas_read on turmas for select to authenticated
  using (id in (select my_historical_turma_ids()) or is_staff_turma(id));

drop policy if exists protocolo_read on protocolo_dias;
create policy protocolo_read on protocolo_dias for select to authenticated
  using (is_admin() or is_support()
    or programa_id in (select t.programa_id from turmas t where t.id in (select my_historical_turma_ids())));
drop policy if exists habitos_read on habitos_definicao;
create policy habitos_read on habitos_definicao for select to authenticated
  using (is_admin() or is_support()
    or programa_id in (select t.programa_id from turmas t where t.id in (select my_historical_turma_ids())));

-- histórico PRÓPRIO -> owns_any_matricula (qualquer status, inclui cancelada)
drop policy if exists contratos_read on contratos;
create policy contratos_read on contratos for select to authenticated
  using (owns_any_matricula(matricula_id) or is_admin() or is_support());
drop policy if exists contratos_insert on contratos;
create policy contratos_insert on contratos for insert to authenticated
  with check (owns_active_matricula(matricula_id));

drop policy if exists checkins_owner on checkins;
drop policy if exists checkins_staff_read on checkins;
create policy checkins_read_own on checkins for select to authenticated
  using (owns_any_matricula(matricula_id));
create policy checkins_read_staff on checkins for select to authenticated
  using (exists (select 1 from matriculas m where m.id=matricula_id and is_staff_turma(m.turma_id)));
create policy checkins_ins on checkins for insert to authenticated
  with check (owns_active_matricula(matricula_id));
create policy checkins_upd on checkins for update to authenticated
  using (owns_active_matricula(matricula_id)) with check (owns_active_matricula(matricula_id));
create policy checkins_del on checkins for delete to authenticated
  using (owns_active_matricula(matricula_id));

drop policy if exists checkin_habitos_owner on checkin_habitos;
create policy checkin_habitos_read on checkin_habitos for select to authenticated
  using (exists (select 1 from checkins c where c.id=checkin_id and owns_any_matricula(c.matricula_id)));
create policy checkin_habitos_write on checkin_habitos for all to authenticated
  using (exists (select 1 from checkins c where c.id=checkin_id and owns_active_matricula(c.matricula_id)))
  with check (exists (select 1 from checkins c where c.id=checkin_id and owns_active_matricula(c.matricula_id)));

drop policy if exists pontuacao_read on pontuacao_agregada;
create policy pontuacao_read on pontuacao_agregada for select to authenticated
  using (can_view_historical_matricula(matricula_id));
drop policy if exists certificados_read on certificados;
create policy certificados_read on certificados for select to authenticated
  using (can_view_historical_matricula(matricula_id));

-- hall: própria entrada (qualquer status) OU área da turma (histórico) OU staff
drop policy if exists hall_read on hall_entries;
create policy hall_read on hall_entries for select to authenticated
  using (owns_any_matricula(matricula_id)
    or turma_id in (select my_historical_turma_ids()) or is_staff_turma(turma_id));

drop policy if exists posts_read on posts;
create policy posts_read on posts for select to authenticated
  using (turma_id in (select my_historical_turma_ids()) or is_staff_turma(turma_id));
drop policy if exists posts_insert on posts;
create policy posts_insert on posts for insert to authenticated
  with check (owns_active_matricula(matricula_id) and is_active_member_turma(turma_id));
drop policy if exists posts_update_own on posts;
create policy posts_update_own on posts for update to authenticated
  using (owns_active_matricula(matricula_id)) with check (owns_active_matricula(matricula_id));
drop policy if exists posts_delete on posts;
create policy posts_delete on posts for delete to authenticated
  using (owns_active_matricula(matricula_id) or is_staff_turma(turma_id));
-- posts_moderate (staff) permanece.

drop policy if exists curtidas_read on curtidas;
create policy curtidas_read on curtidas for select to authenticated
  using (exists (select 1 from posts p where p.id=post_id
    and (p.turma_id in (select my_historical_turma_ids()) or is_staff_turma(p.turma_id))));
drop policy if exists curtidas_insert on curtidas;
create policy curtidas_insert on curtidas for insert to authenticated
  with check (owns_active_matricula(matricula_id)
    and exists (select 1 from posts p where p.id=post_id and is_active_member_turma(p.turma_id)));
drop policy if exists curtidas_delete on curtidas;
create policy curtidas_delete on curtidas for delete to authenticated
  using (owns_active_matricula(matricula_id));

drop policy if exists comentarios_read on comentarios;
create policy comentarios_read on comentarios for select to authenticated
  using (exists (select 1 from posts p where p.id=post_id
    and (p.turma_id in (select my_historical_turma_ids()) or is_staff_turma(p.turma_id))));
drop policy if exists comentarios_insert on comentarios;
create policy comentarios_insert on comentarios for insert to authenticated
  with check (owns_active_matricula(matricula_id)
    and exists (select 1 from posts p where p.id=post_id and is_active_member_turma(p.turma_id)));
drop policy if exists comentarios_update_own on comentarios;
create policy comentarios_update_own on comentarios for update to authenticated
  using (owns_active_matricula(matricula_id)) with check (owns_active_matricula(matricula_id));
drop policy if exists comentarios_delete on comentarios;
create policy comentarios_delete on comentarios for delete to authenticated
  using (owns_active_matricula(matricula_id)
    or exists (select 1 from posts p where p.id=post_id and is_staff_turma(p.turma_id)));

drop policy if exists eventos_read on eventos;
create policy eventos_read on eventos for select to authenticated
  using (is_admin() or is_support()
    or (turma_id is not null and (turma_id in (select my_active_turma_ids()) or is_staff_turma(turma_id)))
    or (programa_id is not null and programa_id in
        (select t.programa_id from turmas t where t.id in (select my_active_turma_ids()))));

-- gp_read e conquistas_user_read usam shares_turma_with (redefinido) — sem recriar.

-- ---------- aposentar helpers antigos ----------
drop function if exists is_member_turma(uuid);
drop function if exists my_turma_ids();
drop function if exists owns_matricula(uuid);
drop function if exists can_view_matricula(uuid);

-- ---------- CLAIM por e-mail (sessão; idempotente; só auto-matricula com turma) ----------
create or replace function reivindicar_meus_entitlements() returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid; v_email text;
begin
  v_user := current_user_id();
  if v_user is null then return; end if;
  select email into v_email from users where id = v_user;
  if v_email is null then return; end if;

  update entitlements set user_id = v_user
   where lower(email)=lower(v_email) and user_id is null and status='ativo';

  -- só auto-matricula quando há turma pretendida; on conflict NUNCA reativa.
  insert into matriculas (user_id, turma_id, entitlement_id, status)
  select e.user_id, e.turma_id, e.id, 'ativa'
    from entitlements e
   where e.user_id=v_user and e.status='ativo' and e.turma_id is not null
  on conflict (user_id, turma_id) do nothing;
end;
$$;

-- ---------- policies de admin ----------
create policy entitlements_admin on entitlements for all to authenticated
  using (is_admin()) with check (is_admin());
create policy matriculas_admin on matriculas for all to authenticated
  using (is_admin()) with check (is_admin());
