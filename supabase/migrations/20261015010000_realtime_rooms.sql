-- Live updates over Supabase Realtime, on private channels named `room:<CODE>`.
-- The server broadcasts a payload-free `state` ping with the secret key (bypasses RLS).
-- Clients may only listen to rooms they belong to, and may only send presence, never broadcasts.

create schema if not exists private;

-- Is the caller the host of, or seated in, the room with this code?
-- security definer: the game tables deny the authenticated role, so the check runs as owner.
create function private.is_room_member(room_code text) returns boolean
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
        or exists (select 1 from public.players p where p.room_id = r.id and p.user_id = (select auth.uid()))
      )
  );
$$;

revoke all on function private.is_room_member(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_room_member(text) to authenticated;

create policy "room members receive room broadcasts and presence"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and (select realtime.topic()) like 'room:%'
  and (select private.is_room_member(split_part((select realtime.topic()), ':', 2)))
);

create policy "room members track presence"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'presence'
  and (select realtime.topic()) like 'room:%'
  and (select private.is_room_member(split_part((select realtime.topic()), ':', 2)))
);
