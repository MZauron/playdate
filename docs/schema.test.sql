-- Kindred schema tests, draft 1 (2026-11-14). 42 checks, all passing against Postgres 16.
-- How it was run (no Supabase needed): a scratch Postgres, the stand-ins below for Supabase's roles and auth,
-- then docs/schema.sql, then this file. Each check prints "PASS <label>" or stops with "FAIL <label>".
--   psql -d scratch -f <stand-ins> -f docs/schema.sql -f docs/schema.test.sql
-- T03 turns these into supabase/tests (pgTAP or Vitest against local Supabase) that run in CI.
--
-- Stand-ins for Supabase (run these first, in a scratch database only):
--   create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
--   create schema auth;
--   create table auth.users (id uuid primary key, phone text);
--   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true),'')::uuid $$;
--   grant usage on schema auth to anon, authenticated;
--   grant execute on function auth.uid() to anon, authenticated;
--   grant usage on schema public to anon, authenticated, service_role;

\set ON_ERROR_STOP 1
grant select, insert, update, delete on all tables in schema public to service_role;
-- users: A=organizer Alex, D=Dev (app friend), M=Maya (app friend, not invited), X=stranger
insert into auth.users values
 ('aaaaaaaa-0000-0000-0000-000000000001','+14165550001'),('dddddddd-0000-0000-0000-000000000002','+14165550002'),
 ('eeeeeeee-0000-0000-0000-000000000003','+14165550003'),('ffffffff-0000-0000-0000-000000000004','+14165550004');
insert into profiles(id,first_name,phone_hash) values
 ('aaaaaaaa-0000-0000-0000-000000000001','Alex','hA'),('dddddddd-0000-0000-0000-000000000002','Dev','hD'),
 ('eeeeeeee-0000-0000-0000-000000000003','Maya','hM'),('ffffffff-0000-0000-0000-000000000004','Xan','hX');
insert into children(parent_id,first_name,age_label) values ('aaaaaaaa-0000-0000-0000-000000000001','Mia','5');
insert into friends(id,owner_id,parent_name,child_first_name,label,phone_e164,phone_hash,kindred_user_id) values
 ('11111111-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Dev Patel','Arjun','Arjun''s dad','+14165550002','hD','dddddddd-0000-0000-0000-000000000002'),
 ('11111111-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','Aisha Rahman','Zara','Zara''s mom','+14165550009','hZ',null),
 ('11111111-0000-0000-0000-000000000003','ffffffff-0000-0000-0000-000000000004','Maya','Lily','Lily''s mom','+14165550003','hM','eeeeeeee-0000-0000-0000-000000000003');
insert into playdates(id,organizer_id,title,mode,start_at,end_at,message,links_expire_at) values
 ('22222222-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Playdate: Mia, Arjun & Zara','set_time',
  '2026-11-15 19:00+00','2026-11-15 21:00+00','Hey! Park on Sunday?','2026-11-15 21:00+00');
insert into invites(id,playdate_id,organizer_id,friend_id,invitee_user_id,channel,token_hash) values
 ('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000002','app','t1'),
 ('33333333-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002',null,'text','t2');
insert into answers(invite_id,kind,time_version) values ('33333333-0000-0000-0000-000000000001','yes',1);
insert into answers(invite_id,kind,reason,note,time_version) values ('33333333-0000-0000-0000-000000000002','no','busy','sorry!',1);

create function expect_error(sql text, code text, label text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then
    if sqlstate = code then raise notice 'PASS %', label; return; end if;
    raise exception 'FAIL % (got % %)', label, sqlstate, sqlerrm; end;
  raise exception 'FAIL % (no error)', label;
end $$;
grant execute on function expect_error(text,text,text) to authenticated, anon;
create function expect_count(sql text, n int, label text) returns void language plpgsql as $$
declare c int; begin execute 'select count(*) from ('||sql||') q' into c;
  if c = n then raise notice 'PASS % (%)', label, c; else raise exception 'FAIL % expected % got %', label, n, c; end if; end $$;
grant execute on function expect_count(text,int,text) to authenticated, anon;

-- ---- constraints (as owner) ----
select expect_error($$insert into playdates(organizer_id,title,mode,start_at,end_at,message,links_expire_at) values ('aaaaaaaa-0000-0000-0000-000000000001','t','set_time','2026-11-15 21:00+00','2026-11-15 19:00+00','hi',now())$$,'23514','KD-03 end after start');
select expect_error($$insert into playdates(organizer_id,title,mode,start_at,end_at,message,links_expire_at) values ('aaaaaaaa-0000-0000-0000-000000000001','t','availability','2026-11-15 19:00+00','2026-11-15 21:00+00','hi',now())$$,'23514','KD-02 availability has no set time');
select expect_error($$insert into playdates(organizer_id,title,mode,start_at,end_at,message,links_expire_at) values ('aaaaaaaa-0000-0000-0000-000000000001','t','set_time','2026-11-15 19:00+00','2026-11-15 21:00+00','   ',now())$$,'23514','KD-05 message required');
select expect_error($$update playdates set status='confirmed' where id='22222222-0000-0000-0000-000000000001'$$,'23514','KD-01 confirmed needs a final time');
select expect_error($$insert into answers(invite_id,kind,time_version) values ('33333333-0000-0000-0000-000000000002','pick',1) on conflict (invite_id) do update set kind='pick'$$,'23514','pick needs a range');
select expect_error($$update answers set reason=null where invite_id='33333333-0000-0000-0000-000000000002'$$,'23514','a decline needs a reason');
select expect_error($$insert into invites(playdate_id,organizer_id,friend_id,channel,token_hash) values ('22222222-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000003','text','t9')$$,'23503','invite only your own friend');
select expect_error($$insert into invites(playdate_id,organizer_id,friend_id,channel,token_hash) values ('22222222-0000-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000003','text','t9')$$,'23503','invite only to your own playdate');
select expect_error($$insert into invites(playdate_id,organizer_id,friend_id,channel,token_hash) values ('22222222-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','app','t9')$$,'23514','app invite needs the account');
select expect_error($$insert into invites(playdate_id,organizer_id,friend_id,invitee_user_id,channel,token_hash) values ('22222222-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000002','app','t9')$$,'23505','one invite per friend per playdate');
insert into groups(id,owner_id,name) values ('44444444-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Dance friends');
select expect_error($$insert into group_members values ('44444444-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001')$$,'23503','group holds only your friends');
select expect_error($$insert into saved_places(owner_id,source,name) values ('aaaaaaaa-0000-0000-0000-000000000001','typed','Home')$$,'23514','typed place needs an address');

-- ---- as Alex (organizer) ----
set role authenticated; select set_config('request.uid','aaaaaaaa-0000-0000-0000-000000000001',false);
select expect_count('select * from playdates',1,'organizer sees playdate');
select expect_count('select id from invites',2,'organizer sees both invites');
select expect_count('select * from answers',2,'organizer sees both answers');
select expect_count('select id from friends',2,'organizer sees own friends only');
select expect_count('select id, first_name from profiles',1,'organizer sees own profile only');
select expect_error($$select phone_hash from profiles$$,'42501','phone_hash hidden');
select expect_error($$select token_hash from invites$$,'42501','token_hash hidden');
select expect_error($$select phone_hash from friends$$,'42501','friend phone_hash hidden');
select expect_error($$insert into playdates(organizer_id,title,mode,start_at,end_at,message,links_expire_at) values ('aaaaaaaa-0000-0000-0000-000000000001','t','set_time',now(),now()+interval '1h','hi',now())$$,'42501','no direct playdate writes');
select expect_error($$update answers set kind='yes'$$,'42501','no direct answer writes');
select expect_error($$insert into friends(owner_id,parent_name,label,phone_e164,phone_hash) values ('aaaaaaaa-0000-0000-0000-000000000001','x','x','+14165550111','hq')$$,'42501','friends are added through the API');
insert into children(parent_id,first_name,age_label) values ('aaaaaaaa-0000-0000-0000-000000000001','Leo','baby');
select expect_error($$insert into children(parent_id,first_name,age_label) values ('dddddddd-0000-0000-0000-000000000002','Hack','3')$$,'42501','no child for another parent');
insert into saved_places(owner_id,source,name,address) values ('aaaaaaaa-0000-0000-0000-000000000001','typed','Our place','12 Elm St');
update profiles set first_name='Alexandra' where id='aaaaaaaa-0000-0000-0000-000000000001';
reset role;

-- ---- as Dev (invited, has the app) ----
set role authenticated; select set_config('request.uid','dddddddd-0000-0000-0000-000000000002',false);
select expect_count('select * from playdates',1,'invitee sees the playdate');
select expect_count('select id from invites',1,'invitee sees only own invite');
select expect_count('select * from answers',1,'invitee sees only own answer');
select expect_count('select id, first_name from profiles',2,'invitee sees self + organizer first name');
select expect_count('select * from children',0,'invitee cannot see organizer children');
select expect_count('select id from friends',0,'invitee cannot see organizer friends');
select expect_count('select * from saved_places',0,'invitee cannot see saved places (home address)');
update profiles set first_name='Hacked' where id='aaaaaaaa-0000-0000-0000-000000000001';
reset role;
select expect_count($$select * from profiles where first_name='Alexandra'$$,1,'invitee cannot rename organizer');
set role authenticated; select set_config('request.uid','dddddddd-0000-0000-0000-000000000002',false);
delete from friends;  -- silently affects 0 rows
reset role;
select expect_count('select id from friends',3,'invitee cannot delete organizer friends');

-- ---- as Maya (friend of someone else, not invited) and Xan ----
set role authenticated; select set_config('request.uid','eeeeeeee-0000-0000-0000-000000000003',false);
select expect_count('select * from playdates',0,'uninvited sees nothing');
select expect_count('select id from invites',0,'uninvited sees no invites');
select expect_count('select * from answers',0,'uninvited sees no answers');
select expect_count('select id from profiles',1,'uninvited sees only self');
reset role;
set role authenticated; select set_config('request.uid','ffffffff-0000-0000-0000-000000000004',false);
select expect_count('select id from friends',1,'Xan sees own friend list (Maya) only');
select expect_count('select * from groups',0,'groups are private');
reset role;

-- ---- anon ----
set role anon; select set_config('request.uid','',false);
select expect_error($$select * from playdates$$,'42501','anon reads nothing');
select expect_error($$select id from profiles$$,'42501','anon no profiles');
reset role;

-- cascades
delete from friends where id='11111111-0000-0000-0000-000000000002';
select expect_count($$select * from answers where invite_id='33333333-0000-0000-0000-000000000002'$$,0,'removing a friend drops their invite and answer');
