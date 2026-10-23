-- One transaction for an accusation: claim the guess slot, store the guess, end the room, store the result.
-- Returns false when the slot was already taken (caller answers 409). Any error rolls everything back.
create function public.submit_guess(
  p_room uuid, p_n int, p_who int[], p_motive text, p_method text, p_correct boolean,
  p_team text, p_case_slug text, p_seconds int, p_score int
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.rooms set guesses_used = p_n
   where id = p_room and status = 'playing' and guesses_used = p_n - 1;
  if not found then return false; end if;

  insert into public.guesses (room_id, n, who, motive, method, correct)
  values (p_room, p_n, p_who, p_motive, p_method, p_correct);

  if p_correct or p_n = 2 then
    update public.rooms
       set status = case when p_correct then 'solved' else 'defeated' end, ended_at = now()
     where id = p_room;
    if p_correct then
      insert into public.results (room_id, case_slug, team, guesses, seconds, score)
      values (p_room, p_case_slug, p_team, p_n, p_seconds, p_score);
    end if;
  end if;
  return true;
end;
$$;

revoke execute on function public.submit_guess(uuid, int, int[], text, text, boolean, text, text, int, int) from public, anon, authenticated;
grant execute on function public.submit_guess(uuid, int, int[], text, text, boolean, text, text, int, int) to service_role;
