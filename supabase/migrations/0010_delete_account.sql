-- 0010_delete_account: Delete my account (T24). Q23 default: when a parent who uses Kindred deletes their account, the invites they
-- received are removed from those playdates (with their answers), so the organizer's page no longer lists them. Before this, the
-- invite's account column was set null, which the app-invite check refuses, so the deletion failed (found in T03).
-- Everything else a parent owns already goes with their profile: children, friends, groups, saved places and the playdates they
-- planned (with those playdates' invites, answers and time slots). Other parents' friend entries for this parent stay, as plain
-- text friends (`friends.kindred_user_id` is set null): they are the other parent's own contacts.

alter table invites drop constraint invites_invitee_user_id_fkey;
alter table invites add constraint invites_invitee_user_id_fkey foreign key (invitee_user_id) references profiles (id) on delete cascade;
