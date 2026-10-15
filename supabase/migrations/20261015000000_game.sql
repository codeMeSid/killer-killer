-- Game rooms, players and lock-ins.
-- Only the server (secret key) touches these tables: RLS is on with no policies, and the
-- anon/authenticated roles have no grants, so a leaked publishable key reads nothing.
-- Game secrets (killer, clues) live in rooms.state and are redacted by the server before they leave.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{8}$'),
  mystery_slug text not null,
  host_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'ended')),
  phase text not null default 'narrating' check (phase in ('narrating', 'choosing', 'resolving', 'finale')),
  round int not null default 0,
  state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rooms_host_id_idx on public.rooms (host_id);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  seat int not null check (seat between 1 and 6),
  joined_at timestamptz not null default now(),
  unique (room_id, user_id),
  unique (room_id, seat)
);

create unique index players_room_name_idx on public.players (room_id, lower(name));
create index players_user_id_idx on public.players (user_id);

create table public.picks (
  room_id uuid not null references public.rooms (id) on delete cascade,
  round int not null,
  player_id uuid not null references public.players (id) on delete cascade,
  option_id text not null,
  pushed boolean not null default false,
  target_player_id uuid references public.players (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (room_id, round, player_id)
);

create index picks_player_id_idx on public.picks (player_id);
create index picks_target_player_id_idx on public.picks (target_player_id);

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.picks enable row level security;

revoke all on public.rooms, public.players, public.picks from anon, authenticated;

create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger rooms_touch_updated_at
before update on public.rooms
for each row execute function public.touch_updated_at();
