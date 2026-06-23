-- ============================================================================
-- Código 21 — Migration 0009: Protocolo / Fases (BLOCO PROTOCOLO, FASE A)
-- Pré-req: 0001–0008. Elimina o enum `fase` e o substitui pela tabela
-- programa_fases. A ÚNICA fonte da fase de um dia passa a ser
-- protocolo_dias.fase_id (sem dia_inicio/dia_fim — sem segunda verdade).
-- Reuso: nenhuma constante de dias/fases; tudo por programa.
-- Escopo: SOMENTE fases. Conteúdo, lock e publicação ficam para a FASE B (0010).
-- ============================================================================

begin;

-- 1) Tabela de fases por programa (sem faixas de dias) -----------------------
create table programa_fases (
  id          uuid primary key default gen_random_uuid(),
  programa_id uuid not null references programas(id) on delete cascade,
  ordem       int  not null,
  nome        text not null,
  descricao   text,
  created_at  timestamptz not null default now(),
  unique (programa_id, ordem)
);

alter table programa_fases enable row level security;

-- RLS espelhando protocolo_dias (leitura por membro histórico da turma do programa)
create policy programa_fases_read on programa_fases for select to authenticated
  using (is_admin() or is_support()
    or programa_id in (select t.programa_id from turmas t where t.id in (select my_historical_turma_ids())));
create policy programa_fases_admin on programa_fases for all to authenticated
  using (is_admin()) with check (is_admin());

-- 2) Coluna fase_id em protocolo_dias (FK para programa_fases) ---------------
alter table protocolo_dias add column fase_id uuid references programa_fases(id);

-- 3) Backfill: criar fases a partir do enum atual e ligar os dias -----------
--    Mapeamento fixo do enum: fundacao->1/Fundação, tensao->2/Tensão, dominio->3/Domínio.
insert into programa_fases (programa_id, ordem, nome)
select distinct
  pd.programa_id,
  case pd.fase when 'fundacao' then 1 when 'tensao' then 2 when 'dominio' then 3 end as ordem,
  case pd.fase when 'fundacao' then 'Fundação'
               when 'tensao'   then 'Tensão'
               when 'dominio'  then 'Domínio' end as nome
from protocolo_dias pd;

update protocolo_dias pd
set fase_id = pf.id
from programa_fases pf
where pf.programa_id = pd.programa_id
  and pf.ordem = case pd.fase when 'fundacao' then 1 when 'tensao' then 2 when 'dominio' then 3 end;

-- 4) Validação de integridade: nenhum dia pode ficar sem fase_id ------------
do $$
declare n int;
begin
  select count(*) into n from protocolo_dias where fase_id is null;
  if n > 0 then
    raise exception 'Backfill incompleto: % dia(s) sem fase_id', n;
  end if;
end $$;

-- 5) Tornar fase_id obrigatório --------------------------------------------
alter table protocolo_dias alter column fase_id set not null;

-- 6) Remover a coluna enum antiga ------------------------------------------
alter table protocolo_dias drop column fase;

-- 7) Remover o type enum (não há mais dependências) ------------------------
drop type fase;

commit;
