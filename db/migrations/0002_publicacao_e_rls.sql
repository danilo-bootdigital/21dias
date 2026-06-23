-- ============================================================================
-- Código 21 — Migration 0002: publicação + RLS (helpers + policies)
-- Pré-requisito: 0001 aplicada (RLS já habilitada deny-all em todas as tabelas).
-- Escopo (Bloco 4): controle de publicação + helpers + policies controladas.
-- NÃO inclui: seed, auth UI, webhook, dashboard, lógica de jornada.
--
-- Convenções:
--  * Helpers SECURITY DEFINER + STABLE + search_path fixo: leem users/
--    user_roles/matriculas/temporadas IGNORANDO RLS, evitando recursão.
--  * Policies miram `authenticated`. A SERVICE ROLE ignora RLS — é ela que
--    executa os fluxos de sistema (matrícula, pontuação, certificados,
--    notificações), que ficam sem policy de escrita.
--  * Tabelas sem policy permanecem DENY-ALL (só service role).
-- ============================================================================

-- ===================== SCHEMA: publicação + escopo de conquista =============
-- Publicação (default FALSE = nasce oculto; nada de vazar roadmap/rascunho).
alter table temporadas add column if not exists is_publicado boolean not null default false;
alter table programas  add column if not exists is_publicado boolean not null default false;

-- Conquista vinculada (ou não) a um programa:
--   programa_id NULL      -> conquista global (todos os logados veem)
--   programa_id PREENCHIDO -> só quem tem ACESSO (matrícula) ao programa vê
alter table conquistas_definicao
  add column if not exists programa_id uuid references programas(id) on delete cascade;
create index if not exists idx_conquistas_def_programa on conquistas_definicao(programa_id);

-- ============================ HELPERS =======================================
create or replace function current_user_id() returns uuid
  language sql stable security definer set search_path = public, pg_temp as $$
  select id from users where auth_user_id = auth.uid()
$$;

create or replace function has_global_role(p_role app_role) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = current_user_id() and ur.role = p_role and ur.scope_type = 'global')
$$;

create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select has_global_role('admin')
$$;

create or replace function is_support() returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select has_global_role('suporte')
$$;

create or replace function is_member_turma(p_turma uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from matriculas m
    where m.user_id = current_user_id() and m.turma_id = p_turma)
$$;

create or replace function my_turma_ids() returns setof uuid
  language sql stable security definer set search_path = public, pg_temp as $$
  select turma_id from matriculas where user_id = current_user_id()
$$;

create or replace function owns_matricula(p_matricula uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from matriculas m
    where m.id = p_matricula and m.user_id = current_user_id())
$$;

create or replace function is_moderador_turma(p_turma uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = current_user_id() and ur.role = 'moderador_turma'
      and ur.scope_type = 'turma' and ur.scope_id = p_turma)
$$;

create or replace function is_gestor_turma(p_turma uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from turmas t
    join programas pr on pr.id = t.programa_id
    join user_roles ur on ur.user_id = current_user_id() and ur.role = 'gestor'
    where t.id = p_turma and (
      ur.scope_type = 'global'
      or (ur.scope_type = 'programa'  and ur.scope_id = pr.id)
      or (ur.scope_type = 'temporada' and ur.scope_id = pr.temporada_id)))
$$;

create or replace function is_staff_turma(p_turma uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select is_admin() or is_support() or is_moderador_turma(p_turma) or is_gestor_turma(p_turma)
$$;

create or replace function can_view_matricula(p_matricula uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from matriculas m
    where m.id = p_matricula and (
      m.user_id = current_user_id()
      or m.turma_id in (select turma_id from matriculas where user_id = current_user_id())
      or is_staff_turma(m.turma_id)))
$$;

create or replace function shares_turma_with(p_user uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from matriculas m1
    join matriculas m2 on m2.turma_id = m1.turma_id
    where m1.user_id = current_user_id() and m2.user_id = p_user)
$$;

-- a temporada está publicada? (defensivo: programa publicado sob temporada oculta não aparece)
create or replace function temporada_publicada(p_temporada uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select is_publicado from temporadas where id = p_temporada), false)
$$;

-- o usuário tem ACESSO (matrícula em alguma turma) ao programa?
create or replace function tem_acesso_programa(p_programa uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from matriculas m
    join turmas t on t.id = m.turma_id
    where m.user_id = current_user_id() and t.programa_id = p_programa)
$$;

-- ============================ POLICIES ======================================

-- ---- IDENTIDADE ----
create policy users_read on users for select to authenticated
  using (id = current_user_id() or is_admin() or is_support());

create policy gp_read on guerreiro_profiles for select to authenticated
  using (user_id = current_user_id() or is_admin() or is_support() or shares_turma_with(user_id));
create policy gp_insert on guerreiro_profiles for insert to authenticated
  with check (user_id = current_user_id());
create policy gp_update on guerreiro_profiles for update to authenticated
  using (user_id = current_user_id()) with check (user_id = current_user_id());

-- ---- ESTRUTURA DO PROGRAMA (catálogo — só PUBLICADO) ----
create policy temporadas_read on temporadas for select to authenticated
  using (is_publicado or is_admin() or is_support());
create policy temporadas_admin on temporadas for all to authenticated
  using (is_admin()) with check (is_admin());

create policy programas_read on programas for select to authenticated
  using (is_admin() or is_support()
    or (is_publicado and temporada_publicada(temporada_id)));
create policy programas_admin on programas for all to authenticated
  using (is_admin()) with check (is_admin());

create policy turmas_read on turmas for select to authenticated
  using (is_member_turma(id) or is_staff_turma(id));
create policy turmas_admin on turmas for all to authenticated
  using (is_admin()) with check (is_admin());

create policy protocolo_read on protocolo_dias for select to authenticated
  using (is_admin() or is_support()
    or programa_id in (select t.programa_id from turmas t where t.id in (select my_turma_ids())));
create policy protocolo_admin on protocolo_dias for all to authenticated
  using (is_admin()) with check (is_admin());

create policy habitos_read on habitos_definicao for select to authenticated
  using (is_admin() or is_support()
    or programa_id in (select t.programa_id from turmas t where t.id in (select my_turma_ids())));
create policy habitos_admin on habitos_definicao for all to authenticated
  using (is_admin()) with check (is_admin());

-- ---- ACESSO & COMPROMISSO ----
create policy entitlements_read on entitlements for select to authenticated
  using (user_id = current_user_id() or is_admin() or is_support());

create policy matriculas_read on matriculas for select to authenticated
  using (user_id = current_user_id() or is_staff_turma(turma_id));

create policy contratos_read on contratos for select to authenticated
  using (owns_matricula(matricula_id) or is_admin() or is_support());
create policy contratos_insert on contratos for insert to authenticated
  with check (owns_matricula(matricula_id));

-- ---- JORNADA & MÉTRICAS ----
create policy checkins_owner on checkins for all to authenticated
  using (owns_matricula(matricula_id)) with check (owns_matricula(matricula_id));
create policy checkins_staff_read on checkins for select to authenticated
  using (exists (select 1 from matriculas m where m.id = matricula_id and is_staff_turma(m.turma_id)));

create policy checkin_habitos_owner on checkin_habitos for all to authenticated
  using (exists (select 1 from checkins c where c.id = checkin_id and owns_matricula(c.matricula_id)))
  with check (exists (select 1 from checkins c where c.id = checkin_id and owns_matricula(c.matricula_id)));

create policy pontuacao_read on pontuacao_agregada for select to authenticated
  using (can_view_matricula(matricula_id));

-- ---- SOCIAL ----
create policy posts_read on posts for select to authenticated
  using (turma_id in (select my_turma_ids()) or is_staff_turma(turma_id));
create policy posts_insert on posts for insert to authenticated
  with check (owns_matricula(matricula_id) and is_member_turma(turma_id));
create policy posts_update_own on posts for update to authenticated
  using (owns_matricula(matricula_id)) with check (owns_matricula(matricula_id));
create policy posts_moderate on posts for update to authenticated
  using (is_staff_turma(turma_id)) with check (is_staff_turma(turma_id));
create policy posts_delete on posts for delete to authenticated
  using (owns_matricula(matricula_id) or is_staff_turma(turma_id));

create policy curtidas_read on curtidas for select to authenticated
  using (exists (select 1 from posts p where p.id = post_id
    and (p.turma_id in (select my_turma_ids()) or is_staff_turma(p.turma_id))));
create policy curtidas_insert on curtidas for insert to authenticated
  with check (owns_matricula(matricula_id)
    and exists (select 1 from posts p where p.id = post_id and is_member_turma(p.turma_id)));
create policy curtidas_delete on curtidas for delete to authenticated
  using (owns_matricula(matricula_id));

create policy comentarios_read on comentarios for select to authenticated
  using (exists (select 1 from posts p where p.id = post_id
    and (p.turma_id in (select my_turma_ids()) or is_staff_turma(p.turma_id))));
create policy comentarios_insert on comentarios for insert to authenticated
  with check (owns_matricula(matricula_id)
    and exists (select 1 from posts p where p.id = post_id and is_member_turma(p.turma_id)));
create policy comentarios_update_own on comentarios for update to authenticated
  using (owns_matricula(matricula_id)) with check (owns_matricula(matricula_id));
create policy comentarios_delete on comentarios for delete to authenticated
  using (owns_matricula(matricula_id)
    or exists (select 1 from posts p where p.id = post_id and is_staff_turma(p.turma_id)));

-- ---- CONQUISTAS & LEGADO ----
-- definição: global (programa_id NULL) p/ todos; específica só p/ quem tem acesso ao programa.
create policy conquistas_def_read on conquistas_definicao for select to authenticated
  using (is_admin() or is_support() or programa_id is null or tem_acesso_programa(programa_id));
create policy conquistas_def_admin on conquistas_definicao for all to authenticated
  using (is_admin()) with check (is_admin());

create policy conquistas_user_read on conquistas_usuario for select to authenticated
  using (user_id = current_user_id() or is_admin() or is_support() or shares_turma_with(user_id));

create policy certificados_read on certificados for select to authenticated
  using (can_view_matricula(matricula_id));

create policy hall_read on hall_entries for select to authenticated
  using (turma_id in (select my_turma_ids()) or is_staff_turma(turma_id));

-- ---- BORDAS ----
create policy eventos_read on eventos for select to authenticated
  using (is_admin() or is_support()
    or (turma_id is not null and (turma_id in (select my_turma_ids()) or is_staff_turma(turma_id)))
    or (programa_id is not null and programa_id in
        (select t.programa_id from turmas t where t.id in (select my_turma_ids()))));
create policy eventos_admin on eventos for all to authenticated
  using (is_admin()) with check (is_admin());

create policy notificacoes_read on notificacoes for select to authenticated
  using (user_id = current_user_id());
create policy notificacoes_update on notificacoes for update to authenticated
  using (user_id = current_user_id()) with check (user_id = current_user_id());

-- ---- RBAC & AUDITORIA ----
create policy user_roles_read on user_roles for select to authenticated
  using (user_id = current_user_id() or is_admin());
create policy user_roles_admin on user_roles for all to authenticated
  using (is_admin()) with check (is_admin());

create policy audit_read on audit_log for select to authenticated
  using (is_admin() or is_support());

-- ============================================================================
-- DENY-ALL mantido (sem policy = só service role):
--   app_settings, organizations, organization_members
-- ============================================================================
