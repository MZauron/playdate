-- T42 (Q30): which of the owner's children each friend's family knows. Private to the owner like friends; server only (no client access).
-- A friend with no rows counts as the owner's first child's friend (Q30 default, as in the mock-up). Rows go with the friend or the child.
create table friend_children (
  friend_id uuid not null references friends (id) on delete cascade,
  child_id uuid not null references children (id) on delete cascade,
  primary key (friend_id, child_id)
);
create index friend_children_child_idx on friend_children (child_id);
alter table friend_children enable row level security;
revoke all on table friend_children from anon, authenticated;

-- Replaces the friend's children with these, keeping only the owner's own children and only for the owner's own friend.
-- Returns how many rows it wrote (0 when the friend isn't theirs).
create function set_friend_children(p_owner_id uuid, p_friend_id uuid, p_child_ids uuid[])
returns integer
language plpgsql set search_path = public as $$
declare
  written integer;
begin
  if not exists (select 1 from friends where id = p_friend_id and owner_id = p_owner_id) then
    return 0;
  end if;
  delete from friend_children where friend_id = p_friend_id;
  insert into friend_children (friend_id, child_id)
  select p_friend_id, c.id from children c where c.parent_id = p_owner_id and c.id = any (p_child_ids);
  get diagnostics written = row_count;
  return written;
end $$;

revoke all on function set_friend_children(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function set_friend_children(uuid, uuid, uuid[]) to service_role;
