-- 0012_friend_links: Invite to Kindred (T34, Q26). Each parent can share a personal link; a parent who signs up or signs in through
-- it becomes a friend on both sides, with no phone number typed. Like invite links (KD-14) a link is 128 random bits and only its
-- sha256 is stored. A parent may have several links out (one per share); "Stop my old links" deletes them all.
-- Server only: no client may read or write a link, and the befriending function is for the service role.

create table friend_links (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles (id) on delete cascade,
  token_hash  text not null unique,                   -- sha256 of the link token; the token is never stored
  created_at  timestamptz not null default now()
);
create index friend_links_owner on friend_links (owner_id);

alter table friend_links enable row level security;  -- and no policy: nothing for clients
revoke all on friend_links from public, anon, authenticated;

-- Makes A and B friends on both sides: each gets a friend row for the other with the other's first name, their first child's first
-- name (Q4 default) and "<child>'s parent" (Q17 default), the other's own phone hash (so a later typed number is a duplicate, and
-- "has Kindred" holds) and their account. A friend row that already exists for that number keeps its name and label and only gets
-- the account. Returns false when A and B are the same parent.
create function befriend(p_a uuid, p_b uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  side record;
begin
  if p_a = p_b then return false; end if;
  for side in
    select o.id as owner_id, f.id as friend_id, f.first_name, f.phone_hash,
           (select c.first_name from children c where c.parent_id = f.id order by c.sort, c.created_at limit 1) as child
    from profiles o
    join profiles f on (o.id = p_a and f.id = p_b) or (o.id = p_b and f.id = p_a)
  loop
    insert into friends (owner_id, parent_name, child_first_name, label, phone_hash, kindred_user_id)
    values (side.owner_id, side.first_name, side.child,
            coalesce(side.child || '''s parent', side.first_name),
            coalesce(side.phone_hash, 'profile:' || side.friend_id), side.friend_id)  -- every finished Setup has a hash
    on conflict (owner_id, phone_hash) do update set kindred_user_id = excluded.kindred_user_id;
  end loop;
  return true;
end;
$$;

revoke all on function befriend(uuid, uuid) from public, anon, authenticated;
grant execute on function befriend(uuid, uuid) to service_role;
