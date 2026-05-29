-- ============================================================
-- Migração: adicionar colunas que faltam no schema existente
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Coluna is_public em masses (necessária para página pública /missas/:id)
alter table masses
  add column if not exists is_public boolean not null default false;

-- ── Funções helper para RLS (caso não existam) ───────────────

create or replace function is_team_member(p_team_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id
      and user_id = auth.uid()
  );
$$;

create or replace function team_member_role(p_team_id uuid)
returns text
language sql security definer stable
as $$
  select role::text from team_members
  where team_id = p_team_id
    and user_id = auth.uid()
  limit 1;
$$;

-- ── Verificar RLS ─────────────────────────────────────────────
-- Se as políticas ainda não existem no seu projeto, rode o schema.sql completo.
-- Se já existem, esta migração é suficiente.
