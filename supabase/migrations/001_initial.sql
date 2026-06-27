-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Players table
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Sessions table
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  total_courts integer not null,
  total_games integer not null,
  fixed_partnerships boolean not null default false,
  player_ids jsonb not null default '[]'::jsonb,
  pairs jsonb default null
);

-- Matches table
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  game_number integer not null,
  court_number integer not null,
  team_a_player1 uuid not null references players(id),
  team_a_player2 uuid not null references players(id),
  team_b_player1 uuid not null references players(id),
  team_b_player2 uuid not null references players(id)
);

-- Indexes for efficient querying
create index if not exists matches_session_id_idx on matches(session_id);
create index if not exists matches_game_number_idx on matches(session_id, game_number);

-- Row Level Security (enable and allow all for anon key — tighten per auth needs)
alter table players enable row level security;
alter table sessions enable row level security;
alter table matches enable row level security;

create policy "Allow all on players" on players for all using (true) with check (true);
create policy "Allow all on sessions" on sessions for all using (true) with check (true);
create policy "Allow all on matches" on matches for all using (true) with check (true);

-- Seed some sample players (optional — remove if not wanted)
insert into players (name) values
  ('Alice'),
  ('Bob'),
  ('Carol'),
  ('Dave'),
  ('Eve'),
  ('Frank'),
  ('Grace'),
  ('Hank')
on conflict do nothing;
