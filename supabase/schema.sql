-- ============================================================
-- Repertório de Missas — Schema completo com RLS
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────

create type team_role as enum ('admin', 'editor', 'contributor', 'viewer');

create type liturgical_year as enum ('A', 'B', 'C');

create type mass_part as enum (
  'entrada',
  'ato_penitencial',
  'hino_de_louvor',
  'salmo',
  'sequencia',
  'aclamacao',
  'ofertorio',
  'santo',
  'cordeiro',
  'comunhao',
  'pos_comunhao',
  'final'
);

create type liturgical_season as enum (
  'tempo_comum',
  'advento',
  'natal',
  'quaresma',
  'pascoa',
  'pentecostes',
  'outros'
);

-- ── Tabelas ──────────────────────────────────────────────────

-- Equipes litúrgicas
create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- Membros das equipes
create table team_members (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  team_id    uuid not null references teams(id) on delete cascade,
  role       team_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique(user_id, team_id)
);

-- Músicas do repertório
create table songs (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  name       text not null,
  artist     text,
  category   text,
  created_at timestamptz not null default now()
);

-- Celebrações / Missas
create table masses (
  id               uuid primary key default gen_random_uuid(),
  team_id          uuid not null references teams(id) on delete cascade,
  title            text not null,
  celebration_date date not null,
  liturgical_year  liturgical_year,
  is_public        boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Músicas vinculadas às missas
create table mass_songs (
  id                  uuid primary key default gen_random_uuid(),
  mass_id             uuid not null references masses(id) on delete cascade,
  song_id             uuid not null references songs(id) on delete cascade,
  part                mass_part not null,
  position            smallint not null default 0,
  singer_file_url     text,
  instrumental_file_url text,
  created_at          timestamptz not null default now()
);

-- ── Índices ──────────────────────────────────────────────────

create index on team_members(user_id);
create index on team_members(team_id);
create index on songs(team_id);
create index on masses(team_id);
create index on masses(celebration_date);
create index on mass_songs(mass_id);
create index on mass_songs(song_id);

-- ── Row Level Security ────────────────────────────────────────

alter table teams        enable row level security;
alter table team_members enable row level security;
alter table songs        enable row level security;
alter table masses       enable row level security;
alter table mass_songs   enable row level security;

-- Helper: verifica se o usuário autenticado pertence a uma equipe
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

-- Helper: retorna o role do usuário em uma equipe
create or replace function team_member_role(p_team_id uuid)
returns team_role
language sql security definer stable
as $$
  select role from team_members
  where team_id = p_team_id
    and user_id = auth.uid()
  limit 1;
$$;

-- ── Políticas: teams ─────────────────────────────────────────

create policy "teams: membros podem ver"
  on teams for select
  using (is_team_member(id));

create policy "teams: admins podem atualizar"
  on teams for update
  using (team_member_role(id) = 'admin');

-- Criação de equipe: qualquer usuário autenticado cria e se torna admin
create policy "teams: usuário autenticado pode criar"
  on teams for insert
  with check (auth.uid() is not null);

create policy "teams: admins podem deletar"
  on teams for delete
  using (team_member_role(id) = 'admin');

-- ── Políticas: team_members ──────────────────────────────────

create policy "team_members: membros podem ver"
  on team_members for select
  using (is_team_member(team_id));

create policy "team_members: admins gerenciam membros"
  on team_members for insert
  with check (team_member_role(team_id) = 'admin');

create policy "team_members: usuário ingressa na própria equipe"
  on team_members for insert
  with check (user_id = auth.uid());

create policy "team_members: admins removem membros"
  on team_members for delete
  using (
    team_member_role(team_id) = 'admin'
    or user_id = auth.uid()   -- o próprio usuário pode sair
  );

create policy "team_members: admins alteram roles"
  on team_members for update
  using (team_member_role(team_id) = 'admin');

-- ── Políticas: songs ─────────────────────────────────────────

create policy "songs: membros podem ver"
  on songs for select
  using (is_team_member(team_id));

create policy "songs: editor+ podem criar"
  on songs for insert
  with check (
    team_member_role(team_id) in ('admin', 'editor', 'contributor')
  );

create policy "songs: editor+ podem atualizar"
  on songs for update
  using (
    team_member_role(team_id) in ('admin', 'editor', 'contributor')
  );

create policy "songs: admin/editor podem deletar"
  on songs for delete
  using (
    team_member_role(team_id) in ('admin', 'editor')
  );

-- ── Políticas: masses ────────────────────────────────────────

create policy "masses: membros podem ver privadas"
  on masses for select
  using (
    is_team_member(team_id)
    or is_public = true
  );

create policy "masses: editor+ podem criar"
  on masses for insert
  with check (
    team_member_role(team_id) in ('admin', 'editor', 'contributor')
  );

create policy "masses: editor+ podem atualizar"
  on masses for update
  using (
    team_member_role(team_id) in ('admin', 'editor', 'contributor')
  );

create policy "masses: admin/editor podem deletar"
  on masses for delete
  using (
    team_member_role(team_id) in ('admin', 'editor')
  );

-- ── Políticas: mass_songs ────────────────────────────────────

-- Acessa através da missa (pública ou membro)
create policy "mass_songs: acesso via missa"
  on mass_songs for select
  using (
    exists (
      select 1 from masses m
      where m.id = mass_id
        and (m.is_public = true or is_team_member(m.team_id))
    )
  );

create policy "mass_songs: editor+ podem inserir"
  on mass_songs for insert
  with check (
    exists (
      select 1 from masses m
      where m.id = mass_id
        and team_member_role(m.team_id) in ('admin', 'editor', 'contributor')
    )
  );

create policy "mass_songs: editor+ podem atualizar"
  on mass_songs for update
  using (
    exists (
      select 1 from masses m
      where m.id = mass_id
        and team_member_role(m.team_id) in ('admin', 'editor', 'contributor')
    )
  );

create policy "mass_songs: admin/editor podem deletar"
  on mass_songs for delete
  using (
    exists (
      select 1 from masses m
      where m.id = mass_id
        and team_member_role(m.team_id) in ('admin', 'editor')
    )
  );

-- ── Trigger: ao criar equipe, inserir criador como admin ─────

create or replace function handle_new_team()
returns trigger
language plpgsql security definer
as $$
begin
  insert into team_members (user_id, team_id, role)
  values (auth.uid(), new.id, 'admin');
  return new;
end;
$$;

create trigger on_team_created
  after insert on teams
  for each row execute function handle_new_team();
