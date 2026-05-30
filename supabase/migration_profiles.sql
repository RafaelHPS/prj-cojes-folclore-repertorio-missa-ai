-- ============================================================
-- Migração: criar/corrigir tabela profiles com RLS adequado
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Cria a tabela se não existir
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  team_id    uuid references teams(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Usuário pode ver e atualizar o próprio perfil
create policy "profiles: user can select own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: user can update own"
  on profiles for update
  using (auth.uid() = id);

create policy "profiles: user can insert own"
  on profiles for insert
  with check (auth.uid() = id);

-- Membros de uma equipe podem ver os perfis dos outros membros da mesma equipe
create policy "profiles: team members can see each other"
  on profiles for select
  using (
    exists (
      select 1
      from team_members tm1
      join team_members tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid()
        and tm2.user_id = profiles.id
    )
  );

-- Trigger: cria perfil automaticamente quando um usuário é criado via auth
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Garante que usuários existentes (que não têm perfil ainda) tenham um registro
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
