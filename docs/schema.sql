-- Kindred schema, draft 1 (2026-11-14). Target: Supabase Postgres 15+.
-- Source of truth for the first migration (T03 copies it to supabase/migrations/0001_init.sql).
-- Rules referenced as KD-xx are in docs/DESIGN.md.
--
-- Access model (DESIGN.md "Data access"), same as Lash and Aquatix:
-- * Clients never write. Every write is a server action or route handler: zod -> auth.getUser() -> src/lib/rules
--   -> repository (service role), scoped to the signed-in parent.
-- * The browser keeps SELECT only, limited by RLS, for Supabase Realtime on the organizer's playdate page
--   and as a second line of defence for server reads made with the user's session.
-- * Friends without an account never touch the database: the invite page acts only through the link token.
-- * Secrets kept away from clients by column privileges: profiles.phone_hash, friends.phone_hash, invites.token_hash.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type time_mode      as enum ('set_time', 'availability');           -- KD-02
create type day_slot       as enum ('morning', 'afternoon', 'evening');   -- KD-04, times in DESIGN.md (Q8)
create type playdate_status as enum ('collecting', 'confirmed', 'cancelled');
create type invite_channel as enum ('app', 'text');
create type invite_label   as enum ('none', 'updated', 'new_time');       -- KD-10
create type answer_kind    as enum ('yes', 'no', 'pick');                 -- KD-07
create type decline_reason as enum ('maybe_another_time', 'busy', 'not_feeling_well', 'too_far', 'other_plans');
create type place_source   as enum ('typed', 'searched');

-- ---------------------------------------------------------------------------
-- Parents
-- ---------------------------------------------------------------------------
-- One row per signed-in parent. The phone number itself lives in auth.users.phone (Supabase phone sign-in).
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  first_name  text not null check (length(btrim(first_name)) between 1 and 40),
  phone_hash  text unique,                         -- HMAC of the E.164 number, set by the API; used to match contacts
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table children (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references profiles (id) on delete cascade,
  first_name  text not null check (length(btrim(first_name)) between 1 and 40),
  age_label   text not null check (age_label ~ '^(baby|[1-9][0-9]?)$'),   -- 'baby' or years, as in Setup
  sort        smallint not null default 0,
  created_at  timestamptz not null default now()
);
create index children_parent_idx on children (parent_id);

-- ---------------------------------------------------------------------------
-- Friends and groups (private to their owner)
-- ---------------------------------------------------------------------------
create table friends (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references profiles (id) on delete cascade,
  parent_name      text not null check (length(btrim(parent_name)) between 1 and 60),  -- as in the owner's contacts
  child_first_name text check (child_first_name is null or length(btrim(child_first_name)) between 1 and 40),
  label            text not null,                   -- what the owner sees, e.g. "Arjun's dad"
  phone_e164       text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),  -- needed for the sms: link (Q12)
  phone_hash       text not null,                   -- HMAC, same key as profiles.phone_hash
  kindred_user_id  uuid references profiles (id) on delete set null,  -- set when the number belongs to a Kindred parent
  created_at       timestamptz not null default now(),
  unique (owner_id, phone_hash),
  unique (id, owner_id),                            -- target of the composite FKs below
  check (kindred_user_id is null or kindred_user_id <> owner_id)
);
create index friends_owner_idx on friends (owner_id);
create index friends_kindred_user_idx on friends (kindred_user_id);

create table groups (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles (id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 40),
  colour      text not null default 'teal',
  created_at  timestamptz not null default now(),
  unique (id, owner_id)
);
create index groups_owner_idx on groups (owner_id);

-- owner_id is repeated so the composite FKs make it impossible to put another parent's friend in your group.
create table group_members (
  group_id   uuid not null,
  friend_id  uuid not null,
  owner_id   uuid not null,
  primary key (group_id, friend_id),
  foreign key (group_id, owner_id)  references groups  (id, owner_id) on delete cascade,
  foreign key (friend_id, owner_id) references friends (id, owner_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Places the parent saved or hearted
-- ---------------------------------------------------------------------------
-- Searched places keep only the provider's place id plus the parent's own label (provider terms: Q6).
create table saved_places (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references profiles (id) on delete cascade,
  source            place_source not null,
  name              text not null check (length(btrim(name)) between 1 and 80),
  address           text,                           -- typed places only
  provider_place_id text,                           -- searched places only
  is_favourite      boolean not null default false, -- the heart; a typed "Save this place" row has false
  created_at        timestamptz not null default now(),
  check ((source = 'typed'    and address is not null and provider_place_id is null)
      or (source = 'searched' and provider_place_id is not null and address is null))
);
create unique index saved_places_provider_uq on saved_places (owner_id, provider_place_id) where provider_place_id is not null;
create unique index saved_places_typed_uq    on saved_places (owner_id, lower(name)) where source = 'typed';

-- ---------------------------------------------------------------------------
-- Playdates
-- ---------------------------------------------------------------------------
create table playdates (
  id                 uuid primary key default gen_random_uuid(),
  organizer_id       uuid not null references profiles (id) on delete cascade,
  title              text not null,                 -- "Playdate: Mia, Arjun & Lily" (KD-06), rebuilt by the API on changes
  mode               time_mode not null,
  timezone           text not null default 'America/Toronto',  -- the organizer's zone when created (KD-16)
  start_at           timestamptz,                   -- set_time only
  end_at             timestamptz,                   -- set_time only
  place_name         text,
  place_address      text,                          -- typed places only
  place_provider_id  text,                          -- searched places only
  message            text not null check (length(btrim(message)) between 1 and 1000),  -- KD-05
  status             playdate_status not null default 'collecting',
  final_start_at     timestamptz,
  final_end_at       timestamptz,
  time_version       integer not null default 1,    -- bumped when the time changes (KD-10)
  links_expire_at    timestamptz not null,          -- KD-14, computed by the API
  confirmed_at       timestamptz,
  cancelled_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check ((mode = 'set_time' and start_at is not null and end_at is not null and end_at > start_at)
      or (mode = 'availability' and start_at is null and end_at is null)),                    -- KD-02, KD-03
  check ((status = 'confirmed') = (final_start_at is not null and final_end_at is not null and confirmed_at is not null)),  -- KD-01, KD-09
  check (final_end_at is null or final_end_at > final_start_at),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check (place_provider_id is null or place_address is null),
  unique (id, organizer_id)                         -- target of invites' composite FK
);
create index playdates_organizer_idx on playdates (organizer_id, status);

-- The organizer's free slots for an availability playdate (KD-04).
create table availability_slots (
  playdate_id  uuid not null references playdates (id) on delete cascade,
  day          date not null,                       -- in playdates.timezone
  slot         day_slot not null,
  primary key (playdate_id, day, slot)
);

create table invites (
  id               uuid primary key default gen_random_uuid(),
  playdate_id      uuid not null,
  organizer_id     uuid not null,                   -- = the playdate's organizer = the friend's owner (composite FKs)
  friend_id        uuid not null,
  invitee_user_id  uuid references profiles (id) on delete set null,  -- the friend's account when channel = 'app'
  channel          invite_channel not null,
  token_hash       text not null unique,            -- sha256 of the link token; the token is never stored (KD-14)
  label            invite_label not null default 'none',
  majority_notice_at timestamptz,                   -- KD-12: set once, never again
  created_at       timestamptz not null default now(),
  unique (playdate_id, friend_id),
  foreign key (playdate_id, organizer_id) references playdates (id, organizer_id) on delete cascade,
  foreign key (friend_id, organizer_id) references friends (id, owner_id) on delete cascade,
  check ((channel = 'app') = (invitee_user_id is not null))
);
create index invites_invitee_idx on invites (invitee_user_id);

-- One current answer per invite; "Change my answer" replaces it (KD-07).
create table answers (
  invite_id     uuid primary key references invites (id) on delete cascade,
  kind          answer_kind not null,
  reason        decline_reason,
  note          text check (note is null or length(note) <= 280),
  pick_start_at timestamptz,
  pick_end_at   timestamptz,
  time_version  integer not null,                   -- must equal playdates.time_version, checked by the API (KD-10)
  answered_at   timestamptz not null default now(),
  check ((kind = 'pick') = (pick_start_at is not null and pick_end_at is not null)),
  check (pick_end_at is null or pick_end_at > pick_start_at),
  check ((kind = 'no') = (reason is not null)),
  check (kind = 'no' or note is null)
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch  before update on profiles  for each row execute function touch_updated_at();
create trigger playdates_touch before update on playdates for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Helper for RLS (security definer avoids recursive policies)
-- ---------------------------------------------------------------------------
create function is_invited_to(p_playdate uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from invites i where i.playdate_id = p_playdate and i.invitee_user_id = auth.uid());
$$;

create function is_organizer_of(p_playdate uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from playdates p where p.id = p_playdate and p.organizer_id = auth.uid());
$$;

-- An invitee may read the organizer's first name (the invite says "Alex · Mia's parent").
create function organizes_for_me(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from invites i join playdates p on p.id = i.playdate_id
                 where p.organizer_id = p_profile and i.invitee_user_id = auth.uid());
$$;

revoke all on function is_invited_to(uuid), is_organizer_of(uuid), organizes_for_me(uuid) from public;
grant execute on function is_invited_to(uuid), is_organizer_of(uuid), organizes_for_me(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges: nothing for anon; authenticated gets only what the app needs
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

-- SELECT only; no client ever gets INSERT, UPDATE or DELETE (tested).
grant select (id, first_name, created_at, updated_at) on profiles to authenticated;
grant select on children, groups, group_members, saved_places to authenticated;
grant select (id, owner_id, parent_name, child_first_name, label, phone_e164, kindred_user_id, created_at) on friends to authenticated;

grant select on playdates, availability_slots, answers to authenticated;
grant select (id, playdate_id, organizer_id, friend_id, invitee_user_id, channel, label, majority_notice_at, created_at)
  on invites to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table profiles           enable row level security;
alter table children           enable row level security;
alter table friends            enable row level security;
alter table groups             enable row level security;
alter table group_members      enable row level security;
alter table saved_places       enable row level security;
alter table playdates          enable row level security;
alter table availability_slots enable row level security;
alter table invites            enable row level security;
alter table answers            enable row level security;

create policy profiles_read      on profiles      for select to authenticated using (id = auth.uid() or organizes_for_me(id));
create policy children_read      on children      for select to authenticated using (parent_id = auth.uid());
create policy friends_read       on friends       for select to authenticated using (owner_id = auth.uid());
create policy groups_read        on groups        for select to authenticated using (owner_id = auth.uid());
create policy group_members_read on group_members for select to authenticated using (owner_id = auth.uid());
create policy saved_places_read  on saved_places  for select to authenticated using (owner_id = auth.uid());

create policy playdates_read on playdates for select to authenticated
  using (organizer_id = auth.uid() or is_invited_to(id));
create policy slots_read on availability_slots for select to authenticated
  using (is_organizer_of(playdate_id) or is_invited_to(playdate_id));
-- Invitees see only their own invite and answer; other families' picks reach them through the server's payload (KD-11).
create policy invites_read on invites for select to authenticated
  using (organizer_id = auth.uid() or invitee_user_id = auth.uid());
create policy answers_read on answers for select to authenticated
  using (exists (select 1 from invites i where i.id = answers.invite_id
                 and (i.organizer_id = auth.uid() or i.invitee_user_id = auth.uid())));

-- Realtime: the organizer's playdate page listens to answers and invites (DESIGN.md "Live answers").
-- In Supabase: alter publication supabase_realtime add table answers, invites, playdates;  (done in the migration, T03)
