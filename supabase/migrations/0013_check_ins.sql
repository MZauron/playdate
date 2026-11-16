-- 0013_check_ins: check-ins during a playdate (T35, KD-18, Q27 answered 2026-11-16). One row per check-in: the organizer's (no
-- invite) or one invited family's, one of four fixed kinds, an optional note of up to 80 characters. No photos. The server writes them
-- after the rule (src/lib/rules/checkins.ts); clients only read, for the organizer's live page: the organizer and Kindred invitees see
-- their playdate's check-ins, nobody else. Thirty days after the playdate the notes go with the answers' notes (T23 clean-up).

create type check_in_kind as enum ('here', 'late', 'all_good', 'heading_home');

create table check_ins (
  id           uuid primary key default gen_random_uuid(),
  playdate_id  uuid not null references playdates (id) on delete cascade,
  invite_id    uuid references invites (id) on delete cascade,     -- null = the organizer
  kind         check_in_kind not null,
  note         text check (note is null or length(btrim(note)) between 1 and 80),
  created_at   timestamptz not null default now()
);
create index check_ins_playdate on check_ins (playdate_id, created_at);

alter table check_ins enable row level security;
revoke all on check_ins from public, anon, authenticated;
grant select on check_ins to authenticated;
create policy check_ins_read on check_ins for select to authenticated
  using (is_organizer_of(playdate_id) or is_invited_to(playdate_id));

-- The organizer's page hears new check-ins live, like answers (T10).
alter publication supabase_realtime add table check_ins;

-- T23's clean-up also deletes check-in notes thirty days after the playdate (same signature; notes counts both kinds).
create or replace function clean_up_old_playdates(p_cutoff timestamptz)
returns table (links_removed integer, notes_removed integer)
language plpgsql set search_path = public as $$
declare
  links integer;
  notes integer;
  check_in_notes integer;
begin
  update invites set token_hash = null
  where token_hash is not null
    and playdate_id in (select id from playdates where links_expire_at <= p_cutoff);
  get diagnostics links = row_count;

  update answers set note = null
  where note is not null
    and invite_id in (select i.id from invites i join playdates p on p.id = i.playdate_id where p.links_expire_at <= p_cutoff);
  get diagnostics notes = row_count;

  update check_ins set note = null
  where note is not null
    and playdate_id in (select id from playdates where links_expire_at <= p_cutoff);
  get diagnostics check_in_notes = row_count;

  return query select links, notes + check_in_notes;
end $$;

revoke all on function clean_up_old_playdates(timestamptz) from public, anon, authenticated;
grant execute on function clean_up_old_playdates(timestamptz) to service_role;
