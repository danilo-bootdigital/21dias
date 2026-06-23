-- ============================================================================
-- Código 21 — Migration 0003: ponte auth.users -> public.users
-- Pré-requisito: 0001 e 0002 aplicadas.
-- Cria a linha de domínio em public.users quando alguém se cadastra no Auth,
-- e mantém o e-mail em sincronia. SECURITY DEFINER para inserir/atualizar
-- ignorando RLS. NÃO cria perfil (nome_guerreiro vem no onboarding).
-- ============================================================================

create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.email is not null then
    insert into public.users (auth_user_id, email)
    values (new.id, new.email)
    on conflict (auth_user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- mantém o e-mail de domínio em sincronia com o Auth (defensivo)
create or replace function handle_user_email_update() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.email is not null then
    update public.users set email = new.email where auth_user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function handle_user_email_update();

-- ============================================================================
-- BACKFILL: sincroniza usuários já existentes no Auth que ainda não têm linha
-- em public.users (idempotente; defensivo contra e-mail null e duplicidade).
-- ============================================================================
insert into public.users (auth_user_id, email)
select au.id, au.email
from auth.users au
left join public.users u on u.auth_user_id = au.id
where u.id is null
  and au.email is not null
on conflict (auth_user_id) do nothing;

