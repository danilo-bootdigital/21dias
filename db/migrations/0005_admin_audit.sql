-- ============================================================================
-- Código 21 — Migration 0005: auditoria administrativa.
-- Pré-req: 0001..0004. Usa o audit_log existente (RLS deny-all + audit_read).
-- Função SECURITY DEFINER gated em is_admin(): registra actor=current_user_id().
-- Idempotente.
-- ============================================================================

create or replace function registrar_admin_audit(
  p_acao text, p_alvo text, p_meta jsonb default '{}'::jsonb
) returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_admin() then return; end if;   -- só admin registra
  insert into audit_log (actor_id, acao, alvo, meta)
  values (current_user_id(), p_acao, p_alvo, coalesce(p_meta, '{}'::jsonb));
end;
$$;
