-- The accusation vote after round 10 (story tree mm-story-tree/2).
-- Same rules as the other game tables: only the server (secret key) touches it; RLS on, no policies, no grants.

alter table public.rooms drop constraint rooms_phase_check;
alter table public.rooms add constraint rooms_phase_check
  check (phase in ('narrating', 'choosing', 'resolving', 'voting', 'finale'));

create table public.votes (
  room_id uuid not null references public.rooms (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  -- index into the tree's world.suspects; the server checks it against the living voter's candidates
  suspect_index int not null check (suspect_index between 0 and 9),
  created_at timestamptz not null default now(),
  primary key (room_id, player_id)
);

create index votes_player_id_idx on public.votes (player_id);

alter table public.votes enable row level security;
revoke all on public.votes from anon, authenticated;
