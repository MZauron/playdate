-- 0009_favourites: the heart (T18). Q6 default, as in 0008: a searched place keeps ONLY the provider's id, so a hearted place stores no
-- name or address (they are looked up when shown). A searched row exists only while the parent has it hearted; un-hearting deletes it.
-- Typed places ("Save this place") keep their name and address as before. Popular with parents and "parents who like it" read
-- counts only, through two server-only functions; no client can see who hearted what.

alter table saved_places alter column name drop not null;
update saved_places set name = null where source = 'searched';

alter table saved_places drop constraint saved_places_check;
alter table saved_places drop constraint saved_places_name_check;
alter table saved_places add constraint saved_places_source_check check (
     (source = 'typed'    and name is not null and address is not null and provider_place_id is null)
  or (source = 'searched' and provider_place_id is not null and name is null and address is null)
);
alter table saved_places add constraint saved_places_name_check check (name is null or length(btrim(name)) between 1 and 80);

-- "N parents like it" on these places: hearts by distinct parents, only where at least p_min parents hearted it (Q22 default 2).
create function place_like_counts(p_ids text[], p_min integer)
returns table (provider_place_id text, parents integer)
language sql stable set search_path = public as $$
  select s.provider_place_id, count(distinct s.owner_id)::integer
  from saved_places s
  where s.source = 'searched' and s.is_favourite and s.provider_place_id = any(coalesce(p_ids, '{}'))
  group by s.provider_place_id
  having count(distinct s.owner_id) >= p_min
$$;

-- Popular with parents: the most-hearted places, counts only, most first.
create function popular_places(p_min integer, p_limit integer)
returns table (provider_place_id text, parents integer)
language sql stable set search_path = public as $$
  select s.provider_place_id, count(distinct s.owner_id)::integer as parents
  from saved_places s
  where s.source = 'searched' and s.is_favourite
  group by s.provider_place_id
  having count(distinct s.owner_id) >= p_min
  order by parents desc, s.provider_place_id
  limit least(greatest(p_limit, 0), 50)
$$;

-- Supabase grants new functions to everyone; these are for the server only.
revoke all on function place_like_counts(text[], integer) from public, anon, authenticated;
grant execute on function place_like_counts(text[], integer) to service_role;
revoke all on function popular_places(integer, integer) from public, anon, authenticated;
grant execute on function popular_places(integer, integer) to service_role;
