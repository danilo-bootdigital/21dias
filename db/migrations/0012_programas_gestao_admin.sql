-- ============================================================================
-- Código 21 — Migration 0012: Gestão administrativa de Programas.
-- Pré-req: 0001–0011. Escopo: SOMENTE a tabela `programas`. Não toca RLS
-- homologada, triggers de lock (0010), scoring, ranking, turmas, matrículas,
-- check-ins nem perfil.
--
-- Por que esta migration é necessária (auditoria de schema):
--  - `descricao`     -> JÁ EXISTE (0001). Nada a fazer.
--  - `is_publicado`  -> JÁ EXISTE (0002). Nada a fazer.
--  - `arquivamento`  -> NÃO existia. Adicionamos `arquivado_at` (nullable). O
--                       status do programa passa a ser derivado:
--                         arquivado_at IS NOT NULL  -> "arquivado"
--                         is_publicado              -> "publicado"
--                         caso contrário            -> "rascunho"
--  - `auditoria`     -> só havia `created_at`. Adicionamos `updated_at` +
--                       trigger para refletir "Última atualização" na tabela.
--
-- Decisões:
--  - Arquivar NÃO mexe em is_publicado (evita brigar com o guard de 0010, que
--    bloqueia despublicar programa com turma iniciada). "arquivado" tem
--    precedência apenas na exibição; turmas em andamento seguem funcionando.
--  - Unicidade de nome por temporada (apenas entre não-arquivados) é criada de
--    forma DEFENSIVA: se já houver duplicatas no banco, o índice é ignorado com
--    NOTICE em vez de abortar a migration (a aplicação também valida).
-- ============================================================================

begin;

-- 1) Novas colunas (idempotentes, não destrutivas) --------------------------
alter table programas
  add column if not exists arquivado_at timestamptz,
  add column if not exists updated_at   timestamptz not null default now();

-- 2) updated_at automático em qualquer UPDATE -------------------------------
create or replace function trg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists programas_set_updated_at on programas;
create trigger programas_set_updated_at before update on programas
  for each row execute function trg_set_updated_at();

-- 3) Unicidade de nome por temporada (case-insensitive, ignora arquivados) --
--    Defensivo: não aborta a migration se já existirem duplicatas.
do $$
begin
  begin
    create unique index programas_temporada_nome_uniq
      on programas (temporada_id, lower(nome))
      where arquivado_at is null;
  exception when others then
    raise notice 'programas_temporada_nome_uniq nao criado (%): a validacao de nome unico fica a cargo da aplicacao.', sqlerrm;
  end;
end $$;

commit;
