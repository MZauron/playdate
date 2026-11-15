-- 0003_create_playdate: Send invite writes a playdate and its invites in one step (T08).
-- supabase-js cannot run a transaction, so the server calls this function with the service role. The server has already run the
-- rules (src/lib/rules/plan.ts) and checked that every friend belongs to the organizer; the table checks and the composite foreign
-- keys still refuse anything else (another parent's friend, a bad time, a blank message).
-- p_playdate: {"organizer_id", "title", "mode", "timezone", "start_at", "end_at", "place_name", "place_address", "message", "links_expire_at"}
-- p_invites:  [{"friend_id", "invitee_user_id", "channel", "token_hash"}, ...]  (token_hash = sha256 of the link token, KD-14)

create function create_playdate_with_invites(p_playdate jsonb, p_invites jsonb)
returns uuid
language plpgsql set search_path = public as $$
declare
  new_id uuid;
begin
  insert into playdates (organizer_id, title, mode, timezone, start_at, end_at, place_name, place_address, message, links_expire_at)
  values (
    (p_playdate ->> 'organizer_id')::uuid,
    p_playdate ->> 'title',
    (p_playdate ->> 'mode')::time_mode,
    p_playdate ->> 'timezone',
    (p_playdate ->> 'start_at')::timestamptz,
    (p_playdate ->> 'end_at')::timestamptz,
    p_playdate ->> 'place_name',
    p_playdate ->> 'place_address',
    p_playdate ->> 'message',
    (p_playdate ->> 'links_expire_at')::timestamptz
  )
  returning id into new_id;

  insert into invites (playdate_id, organizer_id, friend_id, invitee_user_id, channel, token_hash)
  select new_id, (p_playdate ->> 'organizer_id')::uuid, i.friend_id, i.invitee_user_id, i.channel, i.token_hash
  from jsonb_to_recordset(p_invites) as i(friend_id uuid, invitee_user_id uuid, channel invite_channel, token_hash text);

  return new_id;
end $$;

-- Supabase grants new functions to everyone; this one is for the server only.
revoke all on function create_playdate_with_invites(jsonb, jsonb) from public, anon, authenticated;
grant execute on function create_playdate_with_invites(jsonb, jsonb) to service_role;
