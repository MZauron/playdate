-- 0002_create_profile: Setup writes a parent and their children in one step (T05).
-- supabase-js cannot run a transaction, so the server calls this function with the service role.
-- p_children: [{"first_name": "Mia", "age_label": "5", "sort": 0}, ...]. The table checks (name length, age_label) still apply.
-- A second call for the same parent fails on the primary key (23505): Setup happens once.

create function create_profile_with_children(p_id uuid, p_first_name text, p_phone_hash text, p_children jsonb)
returns void
language plpgsql set search_path = public as $$
begin
  insert into profiles (id, first_name, phone_hash) values (p_id, p_first_name, p_phone_hash);
  insert into children (parent_id, first_name, age_label, sort)
  select p_id, c.first_name, c.age_label, c.sort
  from jsonb_to_recordset(p_children) as c(first_name text, age_label text, sort smallint);
end $$;

-- Supabase grants new functions to everyone; this one is for the server only.
revoke all on function create_profile_with_children(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function create_profile_with_children(uuid, text, text, jsonb) to service_role;
