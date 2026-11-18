-- T39: the Profile tab saves a parent's first name and children in one step. Server only, like create_profile_with_children (0002).
-- Rows with the id of one of THIS parent's children update it; rows without an id, or with an id that isn't theirs, are new children;
-- their children missing from the list are deleted. At least one child stays (Setup's rule). Returns false when there is no profile.
create function update_profile_with_children(p_id uuid, p_first_name text, p_children jsonb)
returns boolean
language plpgsql set search_path = public as $$
declare
  owned uuid[];
begin
  if jsonb_array_length(p_children) < 1 then
    raise exception 'a parent keeps at least one child' using errcode = '23514';
  end if;
  update profiles set first_name = p_first_name where id = p_id;
  if not found then
    return false;
  end if;

  select coalesce(array_agg(id), '{}') into owned from children where parent_id = p_id;

  delete from children
  where parent_id = p_id
    and id not in (select c.id from jsonb_to_recordset(p_children) as c(id uuid) where c.id is not null);

  update children ch
  set first_name = c.first_name, age_label = c.age_label, sort = c.sort
  from jsonb_to_recordset(p_children) as c(id uuid, first_name text, age_label text, sort smallint)
  where ch.id = c.id and ch.parent_id = p_id;

  insert into children (parent_id, first_name, age_label, sort)
  select p_id, c.first_name, c.age_label, c.sort
  from jsonb_to_recordset(p_children) as c(id uuid, first_name text, age_label text, sort smallint)
  where c.id is null or not (c.id = any (owned));

  return true;
end $$;

-- Supabase grants new functions to everyone; this one is for the server only.
revoke all on function update_profile_with_children(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function update_profile_with_children(uuid, text, jsonb) to service_role;
