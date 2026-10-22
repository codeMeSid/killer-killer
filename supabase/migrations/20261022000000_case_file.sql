-- Co-op case file replaces the round-based killer game (spec 2026-10-22).
-- Same rules as before: only the server (secret key) touches these tables; RLS on, no policies, no grants.
-- The two realtime.messages policies from 20261015010000 stay; only the membership check is repointed.

drop table if exists public.votes, public.picks, public.players, public.rooms cascade;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{8}$'),
  case_slug text not null,
  team text not null check (char_length(team) between 1 and 24),
  host_id uuid not null references auth.users (id),
  status text not null default 'playing' check (status in ('playing', 'solved', 'defeated')),
  guesses_used int not null default 0 check (guesses_used between 0 and 2),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  agent int not null check (agent between 1 and 8),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, agent)
);

create index members_user_id_idx on public.members (user_id);

create table public.pins (
  room_id uuid not null references public.rooms (id) on delete cascade,
  item_id text not null,
  agent int not null,
  created_at timestamptz not null default now(),
  primary key (room_id, item_id)
);

-- primary key (room_id, n) = a guess number is claimed once, so a double-submit counts once
create table public.guesses (
  room_id uuid not null references public.rooms (id) on delete cascade,
  n int not null check (n between 1 and 2),
  who int[] not null,
  motive text not null,
  method text not null,
  correct boolean not null,
  created_at timestamptz not null default now(),
  primary key (room_id, n)
);

create table public.results (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  case_slug text not null,
  team text not null,
  guesses int not null,
  seconds int not null,
  score int not null,
  created_at timestamptz not null default now()
);

create index results_case_idx on public.results (case_slug, guesses, seconds);
create index results_score_idx on public.results (score desc);

alter table public.rooms enable row level security;
alter table public.members enable row level security;
alter table public.pins enable row level security;
alter table public.guesses enable row level security;
alter table public.results enable row level security;

revoke all on public.rooms, public.members, public.pins, public.guesses, public.results from anon, authenticated;

-- Host or seated agent. security definer: the tables deny the authenticated role.
create or replace function private.is_room_member(room_code text) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rooms r
    where r.code = room_code
      and (
        r.host_id = (select auth.uid())
        or exists (select 1 from public.members m where m.room_id = r.id and m.user_id = (select auth.uid()))
      )
  );
$$;
