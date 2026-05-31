-- Participantes de uma celebração
-- Execute este script no SQL Editor do Supabase

create table mass_participants (
  id          uuid primary key default gen_random_uuid(),
  mass_id     uuid not null references masses(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  name        text not null,
  type        text not null check (type in ('member', 'guest')),
  created_at  timestamptz not null default now()
);

-- Impede adicionar o mesmo membro duas vezes na mesma missa
create unique index on mass_participants(mass_id, user_id) where user_id is not null;
create index on mass_participants(mass_id);

alter table mass_participants enable row level security;

create policy "mass_participants: membros da equipe podem ver"
  on mass_participants for select
  using (
    exists (
      select 1 from masses m
      join team_members tm on tm.team_id = m.team_id
      where m.id = mass_participants.mass_id
        and tm.user_id = auth.uid()
    )
  );

create policy "mass_participants: editor+ podem inserir"
  on mass_participants for insert
  with check (
    exists (
      select 1 from masses m
      join team_members tm on tm.team_id = m.team_id
      where m.id = mass_participants.mass_id
        and tm.user_id = auth.uid()
        and tm.role in ('admin', 'editor')
    )
  );

create policy "mass_participants: editor+ podem remover"
  on mass_participants for delete
  using (
    exists (
      select 1 from masses m
      join team_members tm on tm.team_id = m.team_id
      where m.id = mass_participants.mass_id
        and tm.user_id = auth.uid()
        and tm.role in ('admin', 'editor')
    )
  );
