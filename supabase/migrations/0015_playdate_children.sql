-- T41 (Q30, KD-06): which of the organizer's children a playdate is for. Server only: no client reads or writes it (invitees see the
-- children only in the stored title, first names, KD-17). Rows go when the playdate or the child goes.
create table playdate_children (
  playdate_id uuid not null references playdates (id) on delete cascade,
  child_id uuid not null references children (id) on delete cascade,
  primary key (playdate_id, child_id)
);
create index playdate_children_child_idx on playdate_children (child_id);
alter table playdate_children enable row level security;
revoke all on table playdate_children from anon, authenticated;

-- Replaces the playdate's children with these, keeping only the organizer's own children and only on the organizer's own playdate.
-- Returns how many rows it wrote (0 when the playdate isn't theirs).
create function set_playdate_children(p_playdate_id uuid, p_organizer_id uuid, p_child_ids uuid[])
returns integer
language plpgsql set search_path = public as $$
declare
  written integer;
begin
  if not exists (select 1 from playdates where id = p_playdate_id and organizer_id = p_organizer_id) then
    return 0;
  end if;
  delete from playdate_children where playdate_id = p_playdate_id;
  insert into playdate_children (playdate_id, child_id)
  select p_playdate_id, c.id from children c where c.parent_id = p_organizer_id and c.id = any (p_child_ids);
  get diagnostics written = row_count;
  return written;
end $$;

revoke all on function set_playdate_children(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function set_playdate_children(uuid, uuid, uuid[]) to service_role;
