-- ============================================================================
-- Código 21 — Migration 0011: Perfil do Guerreiro (campos extras + avatares)
-- Pré-req: 0001–0010. Escopo: SOMENTE o Perfil. Não toca matrícula, check-in,
-- ranking, certificado, cron, scoring nem RLS homologada fora do perfil.
--
-- Entrega:
--  - Novos campos opcionais em guerreiro_profiles (idade, peso, estado_civil,
--    sexo, profissao). Nada destrutivo: nenhuma coluna é removida/renomeada.
--  - DECISÃO DE SCHEMA: reaproveitamos a coluna existente `foto_url` como
--    avatar (NÃO criamos `avatar_url`), evitando duplicidade — já está cabeada
--    em /perfil e nas telas de admin. Antes a foto era preenchida por URL
--    manual; agora passa a receber a URL pública vinda do Storage (upload).
--  - Bucket público `avatars` + políticas de Storage por dono (auth.uid()).
-- ============================================================================

begin;

-- 1) Campos novos do perfil (todos NULLABLE; só `nome_guerreiro` é obrigatório).
alter table guerreiro_profiles
  add column if not exists idade        int,
  add column if not exists peso         numeric,
  add column if not exists estado_civil text,
  add column if not exists sexo         text,
  add column if not exists profissao    text;

-- Validações defensivas de faixa (o app também valida). Texto fica livre para
-- não constranger dados sensíveis — a UI usa selects com opções controladas.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gp_idade_chk') then
    alter table guerreiro_profiles
      add constraint gp_idade_chk check (idade is null or (idade between 13 and 120));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'gp_peso_chk') then
    alter table guerreiro_profiles
      add constraint gp_peso_chk check (peso is null or (peso between 30 and 300));
  end if;
end $$;

-- 2) Bucket de avatares — público para leitura (exibição), escrita protegida.
--    Limite de 5MB e MIME types validados pelo próprio Storage (defesa extra).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 3) Políticas de Storage (storage.objects). Estrutura: avatars/{auth.uid}/<arquivo>.
--    O primeiro segmento da pasta tem de ser o auth.uid() do dono — assim um
--    usuário não pode escrever/sobrescrever/apagar a foto de outro.
drop policy if exists "avatars_read_public" on storage.objects;
drop policy if exists "avatars_insert_own"  on storage.objects;
drop policy if exists "avatars_update_own"  on storage.objects;
drop policy if exists "avatars_delete_own"  on storage.objects;

create policy "avatars_read_public" on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
