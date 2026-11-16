-- 0011_no_friend_numbers: Kindred stops keeping friends' phone numbers (Q26, the owner's answer 2026-11-16; T33). Invites and
-- updates are shared from the organizer's own phone through its share sheet, where the parent picks the person from their own
-- contacts, so no text needs a stored number. A number typed when adding a friend is used once, on the server, to make the keyed
-- hash (`phone_hash`) that tells whether they use Kindred and stops the same friend being added twice; then it is dropped.
-- This removes the numbers already stored. The column's client grant goes with it.

alter table friends drop column phone_e164;
