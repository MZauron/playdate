-- T45 (KD-19, Q31 default, the owner's answer 2026-11-18): "Free to play", a status per child that friends see in Kindred. Nothing is
-- sent. Server only (no client access): the server writes it for the parent's own child, and reads it for a viewer only from Kindred
-- parents who are friends both ways (each has the other in their friends, matched to their account). Never on invite links.
create table free_statuses (
  child_id  uuid primary key references children (id) on delete cascade,
  parent_id uuid not null references profiles (id) on delete cascade,
  kind      text not null check (kind in ('this_afternoon', 'this_evening', 'tomorrow', 'this_weekend', 'own_words')),
  words     text check (words is null or (words = btrim(words) and length(words) between 1 and 50)),
  until     timestamptz not null,
  set_at    timestamptz not null default now(),
  check ((kind = 'own_words') = (words is not null)),
  check (until > set_at and until <= set_at + interval '2 days') -- 2 days at most
);
create index free_statuses_parent_idx on free_statuses (parent_id);
alter table free_statuses enable row level security;
revoke all on table free_statuses from anon, authenticated;

-- Sets (or replaces) the status of the parent's own child; false when the child isn't theirs. The end is kept within 2 days of now.
-- Statuses that have turned off are deleted here, so a parent's own words are not kept past their time.
create function set_free_status(p_parent_id uuid, p_child_id uuid, p_kind text, p_words text, p_until timestamptz)
returns boolean
language plpgsql set search_path = public as $$
begin
  delete from free_statuses where until <= now();
  if not exists (select 1 from children where id = p_child_id and parent_id = p_parent_id) then
    return false;
  end if;
  insert into free_statuses (child_id, parent_id, kind, words, until, set_at)
  values (p_child_id, p_parent_id, p_kind, p_words, least(p_until, now() + interval '2 days'), now())
  on conflict (child_id) do update
    set kind = excluded.kind, words = excluded.words, until = excluded.until, set_at = excluded.set_at;
  return true;
end $$;

-- The statuses a viewer may see, one row per free child, by the viewer's own friend row: only from friends matched to a Kindred
-- account who have the viewer in their friends too, and only while the status is on.
create function friends_free_now(p_viewer uuid, p_now timestamptz)
returns table (friend_id uuid, child_first_name text, kind text, words text, until timestamptz)
language sql stable set search_path = public as $$
  select f.id, c.first_name, s.kind, s.words, s.until
  from friends f
  join free_statuses s on s.parent_id = f.kindred_user_id
  join children c on c.id = s.child_id
  where f.owner_id = p_viewer
    and s.until > p_now
    and exists (select 1 from friends back where back.owner_id = f.kindred_user_id and back.kindred_user_id = p_viewer)
  order by s.until, f.id, c.sort, c.created_at;
$$;

revoke all on function set_free_status(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function set_free_status(uuid, uuid, text, text, timestamptz) to service_role;
revoke all on function friends_free_now(uuid, timestamptz) from public, anon, authenticated;
grant execute on function friends_free_now(uuid, timestamptz) to service_role;
