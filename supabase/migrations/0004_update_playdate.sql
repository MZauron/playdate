-- 0004_update_playdate: Send update applies an edit in one step (T16). The server has already run rules/plan.ts and rules/edit.ts
-- (KD-10) and checked that every friend belongs to the organizer; this function only applies that plan, for THIS organizer's
-- playdate. The table checks and composite keys still refuse anything else.
-- p_playdate: {"title", "mode", "start_at", "end_at", "place_name", "place_address", "message", "links_expire_at", "time_version",
--              "status", "clear_final": bool}
-- p_add:     [{"friend_id", "invitee_user_id", "channel", "token_hash"}, ...]   new invites (sha256 of the link token, KD-14)
-- p_remove:  friend ids whose invites (and answers) go
-- p_delete_answers: true on a time change (every answer is cleared, KD-10)
-- p_label:   'updated' or 'new_time' for the invites that stay, or null to leave them

create function update_playdate(p_playdate_id uuid, p_organizer_id uuid, p_playdate jsonb, p_add jsonb, p_remove uuid[], p_delete_answers boolean, p_label invite_label)
returns void
language plpgsql set search_path = public as $$
declare
  clear_final boolean := coalesce((p_playdate ->> 'clear_final')::boolean, false);
begin
  update playdates set
    title           = p_playdate ->> 'title',
    mode            = (p_playdate ->> 'mode')::time_mode,
    start_at        = (p_playdate ->> 'start_at')::timestamptz,
    end_at          = (p_playdate ->> 'end_at')::timestamptz,
    place_name      = p_playdate ->> 'place_name',
    place_address   = p_playdate ->> 'place_address',
    message         = p_playdate ->> 'message',
    links_expire_at = (p_playdate ->> 'links_expire_at')::timestamptz,
    time_version    = (p_playdate ->> 'time_version')::integer,
    status          = (p_playdate ->> 'status')::playdate_status,
    final_start_at  = case when clear_final then null else final_start_at end,
    final_end_at    = case when clear_final then null else final_end_at end,
    confirmed_at    = case when clear_final then null else confirmed_at end
  where id = p_playdate_id and organizer_id = p_organizer_id and status <> 'cancelled';
  if not found then
    raise exception 'playdate not found' using errcode = 'P0002';
  end if;

  if p_delete_answers then
    delete from answers where invite_id in (select id from invites where playdate_id = p_playdate_id);
  end if;

  delete from invites where playdate_id = p_playdate_id and friend_id = any(coalesce(p_remove, '{}'));

  if p_label is not null then
    update invites set label = p_label where playdate_id = p_playdate_id;
  end if;

  insert into invites (playdate_id, organizer_id, friend_id, invitee_user_id, channel, token_hash)
  select p_playdate_id, p_organizer_id, i.friend_id, i.invitee_user_id, i.channel, i.token_hash
  from jsonb_to_recordset(coalesce(p_add, '[]'::jsonb)) as i(friend_id uuid, invitee_user_id uuid, channel invite_channel, token_hash text);
end $$;

-- Supabase grants new functions to everyone; this one is for the server only.
revoke all on function update_playdate(uuid, uuid, jsonb, jsonb, uuid[], boolean, invite_label) from public, anon, authenticated;
grant execute on function update_playdate(uuid, uuid, jsonb, jsonb, uuid[], boolean, invite_label) to service_role;
