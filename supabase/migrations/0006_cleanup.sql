-- 0006_cleanup: the cron tick's clean-up (T23). Thirty days after a playdate is over, its invite links stop existing (the token
-- hash is removed, so no link can ever match again) and the friends' notes are deleted. Answers' kinds, picks and the playdate
-- itself stay for the organizer's history.

-- A removed link is NULL: the unique index still holds for the links that exist, and a lookup by hash can never match NULL.
alter table invites alter column token_hash drop not null;

-- p_cutoff: playdates whose links expired at or before this moment are cleaned (the server computes it from rules/links.ts:
-- over for 30 days = links_expire_at, which is the end + 12 h, at or before now − 30 days + 12 h).
-- Idempotent: only rows that still hold a hash or a note change; a second run returns zeros.
create function clean_up_old_playdates(p_cutoff timestamptz)
returns table (links_removed integer, notes_removed integer)
language plpgsql set search_path = public as $$
declare
  links integer;
  notes integer;
begin
  update invites set token_hash = null
  where token_hash is not null
    and playdate_id in (select id from playdates where links_expire_at <= p_cutoff);
  get diagnostics links = row_count;

  update answers set note = null
  where note is not null
    and invite_id in (select i.id from invites i join playdates p on p.id = i.playdate_id where p.links_expire_at <= p_cutoff);
  get diagnostics notes = row_count;

  return query select links, notes;
end $$;

-- Supabase grants new functions to everyone; this one is for the server only.
revoke all on function clean_up_old_playdates(timestamptz) from public, anon, authenticated;
grant execute on function clean_up_old_playdates(timestamptz) to service_role;
