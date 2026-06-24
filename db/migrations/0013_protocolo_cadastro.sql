-- ============================================================================
-- Código 21 — Migration 0013: Cadastro de Protocolo (admin) + visualização.
-- Pré-req: 0001–0012. Tudo ADITIVO (nada destrutivo). Não toca: triggers de
-- lock (0010), gate de publicação, scoring/ranking, checkins/checkin_habitos
-- nem a RLS homologada existente.
--
-- Decisão de modelo (auditada): "protocolo" = o conteúdo de um dia já existente
-- em protocolo_dias. Aqui só estendemos esse dia com:
--   - Status Ativo/Inativo (protocolo_ativo) e Descrição (protocolo_descricao);
--   - Check-in do Dia: checklist por dia, SÓ TEXTO, SEM pontuação
--     (protocolo_checkin_itens) + marcações do guerreiro (protocolo_checkin_respostas);
--   - 3 campos de imagem configuráveis por dia (protocolo_imagem_campos, teto 3
--     garantido por check+unique) + envios do guerreiro (protocolo_imagem_envios);
--   - bucket de Storage 'protocolos' (padrão do bucket 'avatars' da 0011).
-- ============================================================================

begin;

-- 1) Colunas novas em protocolo_dias ----------------------------------------
alter table protocolo_dias
  add column if not exists protocolo_ativo     boolean not null default true,
  add column if not exists protocolo_descricao text;

-- 2) Check-in do Dia: checklist por dia (texto, sem pontuação) ---------------
create table if not exists protocolo_checkin_itens (
  id         uuid primary key default gen_random_uuid(),
  dia_id     uuid not null references protocolo_dias(id) on delete cascade,
  ordem      int  not null,
  texto      text not null,
  created_at timestamptz not null default now(),
  unique (dia_id, ordem)
);
create index if not exists idx_proto_checkin_itens_dia on protocolo_checkin_itens(dia_id);

alter table protocolo_checkin_itens enable row level security;
create policy proto_checkin_itens_read on protocolo_checkin_itens for select to authenticated
  using (is_admin() or is_support()
    or exists (select 1 from protocolo_dias d
               where d.id = dia_id
                 and d.programa_id in (select t.programa_id from turmas t
                                       where t.id in (select my_historical_turma_ids()))));
create policy proto_checkin_itens_admin on protocolo_checkin_itens for all to authenticated
  using (is_admin()) with check (is_admin());

-- 3) Marcações do guerreiro no checklist (sem scoring) -----------------------
create table if not exists protocolo_checkin_respostas (
  id         uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references checkins(id) on delete cascade,
  item_id    uuid not null references protocolo_checkin_itens(id) on delete cascade,
  marcado    boolean not null default false,
  unique (checkin_id, item_id)
);
create index if not exists idx_proto_checkin_resp_checkin on protocolo_checkin_respostas(checkin_id);

alter table protocolo_checkin_respostas enable row level security;
-- Espelha checkin_habitos: leitura por dono histórico, escrita só da matrícula ativa.
create policy proto_checkin_resp_read on protocolo_checkin_respostas for select to authenticated
  using (exists (select 1 from checkins c where c.id = checkin_id and owns_any_matricula(c.matricula_id)));
create policy proto_checkin_resp_write on protocolo_checkin_respostas for all to authenticated
  using (exists (select 1 from checkins c where c.id = checkin_id and owns_active_matricula(c.matricula_id)))
  with check (exists (select 1 from checkins c where c.id = checkin_id and owns_active_matricula(c.matricula_id)));
create policy proto_checkin_resp_staff_read on protocolo_checkin_respostas for select to authenticated
  using (exists (select 1 from checkins c join matriculas m on m.id = c.matricula_id
                 where c.id = checkin_id and is_staff_turma(m.turma_id)));

-- 4) Config dos 3 campos de imagem por dia (teto 3) --------------------------
create table if not exists protocolo_imagem_campos (
  id          uuid primary key default gen_random_uuid(),
  dia_id      uuid not null references protocolo_dias(id) on delete cascade,
  slot        int  not null check (slot in (1, 2, 3)),
  ativo       boolean not null default false,
  titulo      text,
  instrucao   text,
  obrigatorio boolean not null default false,
  unique (dia_id, slot)
);
create index if not exists idx_proto_img_campos_dia on protocolo_imagem_campos(dia_id);

alter table protocolo_imagem_campos enable row level security;
create policy proto_img_campos_read on protocolo_imagem_campos for select to authenticated
  using (is_admin() or is_support()
    or exists (select 1 from protocolo_dias d
               where d.id = dia_id
                 and d.programa_id in (select t.programa_id from turmas t
                                       where t.id in (select my_historical_turma_ids()))));
create policy proto_img_campos_admin on protocolo_imagem_campos for all to authenticated
  using (is_admin()) with check (is_admin());

-- 5) Envios de imagem do guerreiro (1+ por campo) ----------------------------
create table if not exists protocolo_imagem_envios (
  id           uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references matriculas(id) on delete cascade,
  dia_numero   int  not null,
  slot         int  not null check (slot in (1, 2, 3)),
  url          text not null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_proto_img_envios_mat_dia on protocolo_imagem_envios(matricula_id, dia_numero);

alter table protocolo_imagem_envios enable row level security;
create policy proto_img_envios_read on protocolo_imagem_envios for select to authenticated
  using (owns_any_matricula(matricula_id));
create policy proto_img_envios_write on protocolo_imagem_envios for all to authenticated
  using (owns_active_matricula(matricula_id)) with check (owns_active_matricula(matricula_id));
create policy proto_img_envios_staff_read on protocolo_imagem_envios for select to authenticated
  using (exists (select 1 from matriculas m where m.id = matricula_id and is_staff_turma(m.turma_id)));

-- 6) Bucket de Storage 'protocolos' (público p/ leitura, escrita por dono) ----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'protocolos', 'protocolos', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Estrutura: protocolos/{auth.uid}/<arquivo> — o 1º segmento é o dono.
drop policy if exists "protocolos_read_public" on storage.objects;
drop policy if exists "protocolos_insert_own"  on storage.objects;
drop policy if exists "protocolos_update_own"  on storage.objects;
drop policy if exists "protocolos_delete_own"  on storage.objects;

create policy "protocolos_read_public" on storage.objects
  for select using (bucket_id = 'protocolos');
create policy "protocolos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'protocolos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "protocolos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'protocolos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'protocolos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "protocolos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'protocolos' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
