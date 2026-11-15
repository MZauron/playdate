-- 0008_searched_places: Find a place (T17). Send invite and Send update also write the provider's place id. Q6 default (Google
-- Places): a searched place keeps ONLY the provider's id; its name and address are fetched when shown and never stored, so a
-- playdate with a provider id has no place name or address (the table refuses one). Same signatures as 0005, replaced in place.
-- p_playdate gains "place_provider_id" (null for a typed place or no place).

alter table playdates
  add constraint playdates_searched_place_stores_id_only check (place_provider_id is null or (place_name is null and place_address is null));

create or replace function create_playdate_with_invites(p_playdate jsonb, p_invites jsonb)
returns uuid
language plpgsql set search_path = public as $$
declare
  new_id uuid;
begin
  insert into playdates (organizer_id, title, mode, timezone, start_at, end_at, place_name, place_address, place_provider_id, message, links_expire_at)
  values (
    (p_playdate ->> 'organizer_id')::uuid,
    p_playdate ->> 'title',
    (p_playdate ->> 'mode')::time_mode,
    p_playdate ->> 'timezone',
    (p_playdate ->> 'start_at')::timestamptz,
    (p_playdate ->> 'end_at')::timestamptz,
    p_playdate ->> 'place_name',
    p_playdate ->> 'place_address',
    p_playdate ->> 'place_provider_id',
    p_playdate ->> 'message',
    (p_playdate ->> 'links_expire_at')::timestamptz
  )
  returning id into new_id;

  insert into availability_slots (playdate_id, day, slot)
  select new_id, s.day, s.slot
  from jsonb_to_recordset(coalesce(p_playdate -> 'slots', '[]'::jsonb)) as s(day date, slot day_slot);

  insert into invites (playdate_id, organizer_id, friend_id, invitee_user_id, channel, token_hash)
  select new_id, (p_playdate ->> 'organizer_id')::uuid, i.friend_id, i.invitee_user_id, i.channel, i.token_hash
  from jsonb_to_recordset(p_invites) as i(friend_id uuid, invitee_user_id uuid, channel invite_channel, token_hash text);

  return new_id;
end $$;

create or replace function update_playdate(p_playdate_id uuid, p_organizer_id uuid, p_playdate jsonb, p_add jsonb, p_remove uuid[], p_delete_answers boolean, p_label invite_label)
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
    place_provider_id = p_playdate ->> 'place_provider_id',
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

  -- The free slots are always rewritten: a set time has none (KD-02).
  delete from availability_slots where playdate_id = p_playdate_id;
  insert into availability_slots (playdate_id, day, slot)
  select p_playdate_id, s.day, s.slot
  from jsonb_to_recordset(coalesce(p_playdate -> 'slots', '[]'::jsonb)) as s(day date, slot day_slot);

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

-- `create or replace` keeps the privileges (service role only); restated so this file stands on its own.
revoke all on function create_playdate_with_invites(jsonb, jsonb) from public, anon, authenticated;
grant execute on function create_playdate_with_invites(jsonb, jsonb) to service_role;
revoke all on function update_playdate(uuid, uuid, jsonb, jsonb, uuid[], boolean, invite_label) from public, anon, authenticated;
grant execute on function update_playdate(uuid, uuid, jsonb, jsonb, uuid[], boolean, invite_label) to service_role;
