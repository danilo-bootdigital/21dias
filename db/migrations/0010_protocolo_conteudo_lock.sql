-- ============================================================================
-- Código 21 — Migration 0010: Protocolo / Conteúdo + Lock (BLOCO PROTOCOLO, FASE B)
-- Pré-req: 0001–0009. Schema-only. Entrega:
--  - conteúdo (texto/link) por dia + marcos embutidos no dia
--  - relaxa missao_pontos para >= 0 (proteção real = lock)
--  - lock de pontuação/estrutura após turma iniciada (triggers no banco)
--  - gate de publicação + bloqueio de unpublish (programas)
--  - invariante: programa publicado => todo dia tem >= 1 conteúdo
-- Não toca Scoring/Ranking/Encerramento/Check-ins. Não cria conteúdo legado.
-- ============================================================================

begin;

-- 1) Colunas de conteúdo/marco no dia ---------------------------------------
alter table protocolo_dias
  add column titulo          text,
  add column instrucoes      text,
  add column eh_marco        boolean not null default false,
  add column marco_titulo    text,
  add column marco_descricao text;

-- 2) Relaxar pontuação (lock passa a ser a proteção real) -------------------
alter table protocolo_dias drop constraint if exists protocolo_dias_missao_pontos_check;
alter table protocolo_dias add  constraint protocolo_dias_missao_pontos_check check (missao_pontos >= 0);

-- 3) Tabela de conteúdos (texto/link) --------------------------------------
create table protocolo_conteudos (
  id         uuid primary key default gen_random_uuid(),
  dia_id     uuid not null references protocolo_dias(id) on delete cascade,
  ordem      int  not null,
  tipo       text not null check (tipo in ('texto','link')),
  titulo     text,
  corpo      text not null,              -- markdown (texto) ou URL (link)
  created_at timestamptz not null default now(),
  unique (dia_id, ordem)
);
create index protocolo_conteudos_dia_idx on protocolo_conteudos (dia_id);

alter table protocolo_conteudos enable row level security;
create policy protocolo_conteudos_read on protocolo_conteudos for select to authenticated
  using (is_admin() or is_support()
    or exists (select 1 from protocolo_dias d
               where d.id = dia_id
                 and d.programa_id in (select t.programa_id from turmas t
                                       where t.id in (select my_historical_turma_ids()))));
create policy protocolo_conteudos_admin on protocolo_conteudos for all to authenticated
  using (is_admin()) with check (is_admin());

-- 4) Helpers ----------------------------------------------------------------
create or replace function programa_tem_turma_iniciada(p_programa uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from turmas
                 where programa_id = p_programa
                   and status in ('ativa','encerrada','arquivada'));
$$;

create or replace function programa_pendencias_publicacao(p_programa uuid)
returns text[] language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v text[] := '{}'; v_dur int; v_dias int; v_fases int;
begin
  select duracao_dias into v_dur from programas where id = p_programa;
  if v_dur is null then return array['Programa inexistente']; end if;
  select count(*) into v_dias from protocolo_dias where programa_id = p_programa;
  if v_dias <> v_dur then
    v := array_append(v, format('Dias (%s) diferente de duracao_dias (%s)', v_dias, v_dur)); end if;
  if exists (select 1 from generate_series(1, v_dur) g
             where not exists (select 1 from protocolo_dias d
                               where d.programa_id = p_programa and d.numero = g)) then
    v := array_append(v, 'Numeracao de dias incompleta (1..duracao_dias)'); end if;
  if exists (select 1 from protocolo_dias where programa_id = p_programa and fase_id is null) then
    v := array_append(v, 'Dias sem fase atribuida'); end if;
  if exists (select 1 from protocolo_dias where programa_id = p_programa
             and (missao_titulo is null or btrim(missao_titulo)='' or missao_pontos is null)) then
    v := array_append(v, 'Dias sem missao configurada'); end if;
  select count(*) into v_fases from programa_fases where programa_id = p_programa;
  if v_fases < 1 then v := array_append(v, 'Programa sem fases'); end if;
  if exists (select 1 from protocolo_dias d where d.programa_id = p_programa
             and not exists (select 1 from protocolo_conteudos c where c.dia_id = d.id)) then
    v := array_append(v, 'Dias sem conteudo (minimo 1 por dia)'); end if;
  return v;
end; $$;

-- 5) Lock: protocolo_dias (numero, missao_pontos, insert/delete) ------------
create or replace function trg_lock_protocolo_dias()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_prog uuid;
begin
  v_prog := coalesce(new.programa_id, old.programa_id);
  if not programa_tem_turma_iniciada(v_prog) then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then raise exception 'Lock: nao adicionar dias apos turma iniciada';
  elsif tg_op = 'DELETE' then raise exception 'Lock: nao remover dias apos turma iniciada';
  elsif tg_op = 'UPDATE' then
    if new.numero is distinct from old.numero then raise exception 'Lock: numero imutavel apos turma iniciada'; end if;
    if new.missao_pontos is distinct from old.missao_pontos then raise exception 'Lock: missao_pontos imutavel apos turma iniciada'; end if;
  end if;
  return coalesce(new, old);
end; $$;
create trigger lock_protocolo_dias before insert or update or delete on protocolo_dias
  for each row execute function trg_lock_protocolo_dias();

-- 6) Lock: habitos_definicao (pontos, insert/delete) -----------------------
create or replace function trg_lock_habitos()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_prog uuid;
begin
  v_prog := coalesce(new.programa_id, old.programa_id);
  if not programa_tem_turma_iniciada(v_prog) then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then raise exception 'Lock: nao adicionar habitos apos turma iniciada';
  elsif tg_op = 'DELETE' then raise exception 'Lock: nao remover habitos apos turma iniciada';
  elsif tg_op = 'UPDATE' then
    if new.pontos is distinct from old.pontos then raise exception 'Lock: pontos do habito imutaveis apos turma iniciada'; end if;
  end if;
  return coalesce(new, old);
end; $$;
create trigger lock_habitos before insert or update or delete on habitos_definicao
  for each row execute function trg_lock_habitos();

-- 7) programas: lock duracao_dias + gate publicar + bloqueio unpublish ------
create or replace function trg_programas_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_pend text[];
begin
  if new.duracao_dias is distinct from old.duracao_dias
     and programa_tem_turma_iniciada(new.id) then
    raise exception 'Lock: duracao_dias imutavel apos turma iniciada'; end if;
  if new.is_publicado and not old.is_publicado then
    v_pend := programa_pendencias_publicacao(new.id);
    if array_length(v_pend,1) is not null then
      raise exception 'Publicacao bloqueada: %', array_to_string(v_pend, '; '); end if;
  end if;
  if old.is_publicado and not new.is_publicado
     and programa_tem_turma_iniciada(new.id) then
    raise exception 'Programa ja possui historico de execucao — nao pode ser despublicado'; end if;
  return new;
end; $$;
create trigger programas_guard before update on programas
  for each row execute function trg_programas_guard();

-- 8) Invariante: dia de programa PUBLICADO nao pode ficar sem conteudo ------
create or replace function trg_conteudo_invariante()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_pub boolean; v_rest int;
begin
  select p.is_publicado into v_pub
    from protocolo_dias d join programas p on p.id = d.programa_id
    where d.id = old.dia_id;
  if not coalesce(v_pub, false) then return coalesce(new, old); end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and new.dia_id is distinct from old.dia_id) then
    select count(*) into v_rest from protocolo_conteudos where dia_id = old.dia_id and id <> old.id;
    if v_rest < 1 then
      raise exception 'Invariante: dia de programa publicado nao pode ficar sem conteudo'; end if;
  end if;
  return coalesce(new, old);
end; $$;
create trigger conteudo_invariante before delete or update on protocolo_conteudos
  for each row execute function trg_conteudo_invariante();

commit;
