-- 0007_save_group: Create a group and Edit write the group and its members in one step (T19). Groups are private to their owner
-- (DESIGN.md "Privacy"); the composite foreign keys of group_members already refuse another parent's friend in your group.
-- p_group_id null = create; otherwise THIS owner's group is renamed and its members replaced. Returns the group id, or raises
-- P0002 when the owner has no such group.

create function save_group(p_owner_id uuid, p_group_id uuid, p_name text, p_friend_ids uuid[])
returns uuid
language plpgsql set search_path = public as $$
declare
  gid uuid;
begin
  if p_group_id is null then
    insert into groups (owner_id, name) values (p_owner_id, p_name) returning id into gid;
  else
    update groups set name = p_name where id = p_group_id and owner_id = p_owner_id returning id into gid;
    if gid is null then
      raise exception 'group not found' using errcode = 'P0002';
    end if;
    delete from group_members where group_id = gid and owner_id = p_owner_id;
  end if;

  insert into group_members (group_id, friend_id, owner_id)
  select gid, f, p_owner_id from unnest(coalesce(p_friend_ids, '{}')) as f
  on conflict do nothing;

  return gid;
end $$;

-- Supabase grants new functions to everyone; this one is for the server only.
revoke all on function save_group(uuid, uuid, text, uuid[]) from public, anon, authenticated;
grant execute on function save_group(uuid, uuid, text, uuid[]) to service_role;
