// Check-ins (T35). Server only. Written after the rule, for one playdate the caller already scoped (the organizer's own, or the
// invite their link or account opened). Each comes back with the poster's first name only (KD-17).
import "server-only";
import type { CheckInStore, StoredCheckIn } from "@/lib/domain/check-ins";
import type { CheckInKind } from "@/lib/rules/checkins";
import { adminClient } from "./admin";

type Row = {
  id: string;
  invite_id: string | null;
  kind: CheckInKind;
  note: string | null;
  created_at: string;
  invites: { friends: { parent_name: string } | null } | null;
  playdates: { profiles: { first_name: string } | null } | null;
};

const firstWord = (name: string) => name.trim().split(/\s+/)[0] ?? "";

export const checkInStore: CheckInStore = {
  async add(playdateId, inviteId, kind, note, at) {
    const { error } = await adminClient().from("check_ins").insert({ playdate_id: playdateId, invite_id: inviteId, kind, note, created_at: at.toISOString() });
    if (error) throw new Error(`addCheckIn failed: ${error.code}`);
  },

  async list(playdateId) {
    const { data, error } = await adminClient()
      .from("check_ins")
      .select("id, invite_id, kind, note, created_at, invites(friends(parent_name)), playdates(profiles(first_name))")
      .eq("playdate_id", playdateId)
      .order("created_at", { ascending: false })
      .limit(50)
      .overrideTypes<Row[], { merge: false }>();
    if (error) throw new Error(`listCheckIns failed: ${error.code}`);
    return (data ?? []).map(
      (r): StoredCheckIn => ({
        id: r.id,
        inviteId: r.invite_id,
        kind: r.kind,
        note: r.note,
        createdAt: new Date(r.created_at),
        firstName: r.invite_id ? firstWord(r.invites?.friends?.parent_name ?? "") : (r.playdates?.profiles?.first_name ?? ""),
      }),
    );
  },
};
