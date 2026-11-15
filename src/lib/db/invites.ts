// The invite page's store (T09). Server only. A friend without an account has no session: the ONLY key is the sha256 of the link
// token, and every query is scoped to the one invite it matches. Nothing here selects a phone number or a hash; of the other
// invites on the same playdate, only their parents' first names and current picks are read (Everyone's picks, KD-11, KD-17).
import "server-only";
import type { InviteStore, StoredInvite } from "@/lib/domain/invite-page";
import type { AnswerKind, DaySlot, DeclineReason, InviteLabel, PlaydateStatus, TimeMode } from "@/lib/rules/types";
import { adminClient } from "./admin";

type Row = {
  id: string;
  label: InviteLabel;
  playdates: {
    id: string;
    title: string;
    mode: TimeMode;
    status: PlaydateStatus;
    timezone: string;
    start_at: string | null;
    end_at: string | null;
    final_start_at: string | null;
    final_end_at: string | null;
    place_name: string | null;
    place_address: string | null;
    message: string;
    time_version: number;
    links_expire_at: string;
    organizer_id: string;
    profiles: { first_name: string } | null;
    availability_slots: { day: string; slot: DaySlot }[];
  } | null;
  answers: { kind: AnswerKind; reason: DeclineReason | null; note: string | null; pick_start_at: string | null; pick_end_at: string | null; time_version: number } | null;
};

type PickRow = {
  id: string;
  friends: { parent_name: string } | null;
  answers: { kind: AnswerKind; pick_start_at: string | null; pick_end_at: string | null; time_version: number } | null;
};

const date = (value: string | null) => (value ? new Date(value) : null);

/**
 * One invite and its playdate, as the invite page shows it. `where` is either the link's hash (a friend without an account) or the
 * invite id together with the signed-in invitee's own user id (a Kindred friend, T15): both read exactly the same fields.
 */
async function findOne(where: { token_hash: string } | { id: string; invitee_user_id: string }): Promise<StoredInvite | null> {
    const db = adminClient();
    const { data, error } = await db
      .from("invites")
      .select(
        "id, label, playdates(id, title, mode, status, timezone, start_at, end_at, final_start_at, final_end_at, place_name, place_address, message, time_version, links_expire_at, organizer_id, profiles(first_name), availability_slots(day, slot)), answers(kind, reason, note, pick_start_at, pick_end_at, time_version)",
      )
      .match(where)
      .maybeSingle()
      .overrideTypes<Row, { merge: false }>();
    if (error) throw new Error(`findInvite failed: ${error.code}`);
    const p = data?.playdates;
    if (!data || !p) return null;

    // "Alex · Mia's parent": the organizer's first child (Q4 default).
    const { data: child, error: childError } = await db
      .from("children")
      .select("first_name")
      .eq("parent_id", p.organizer_id)
      .order("sort")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (childError) throw new Error(`findByTokenHash child failed: ${childError.code}`);

    const answer = data.answers && data.answers.time_version === p.time_version ? data.answers : null;

    // Everyone's picks (availability only): each family's current pick and the parent's first name. Nothing else of theirs.
    let picks: StoredInvite["picks"] = [];
    if (p.mode === "availability") {
      const { data: rows, error: picksError } = await db
        .from("invites")
        .select("id, friends(parent_name), answers(kind, pick_start_at, pick_end_at, time_version)")
        .eq("playdate_id", p.id)
        .overrideTypes<PickRow[], { merge: false }>();
      if (picksError) throw new Error(`findByTokenHash picks failed: ${picksError.code}`);
      picks = (rows ?? []).flatMap((r) => {
        const a = r.answers;
        if (!a || a.kind !== "pick" || a.time_version !== p.time_version || !a.pick_start_at || !a.pick_end_at) return [];
        const firstName = (r.friends?.parent_name ?? "").trim().split(/\s+/)[0] ?? "";
        return [{ inviteId: r.id, firstName, range: { start: new Date(a.pick_start_at), end: new Date(a.pick_end_at) } }];
      });
    }
    const stored: StoredInvite = {
      inviteId: data.id,
      label: data.label,
      playdate: {
        title: p.title,
        mode: p.mode,
        status: p.status,
        timezone: p.timezone,
        startAt: date(p.start_at),
        endAt: date(p.end_at),
        finalStartAt: date(p.final_start_at),
        finalEndAt: date(p.final_end_at),
        placeName: p.place_name,
        placeAddress: p.place_address,
        message: p.message,
        timeVersion: p.time_version,
        linksExpireAt: new Date(p.links_expire_at),
        slots: p.availability_slots,
      },
      organizer: { firstName: p.profiles?.first_name ?? "", childFirstName: child?.first_name ?? null },
      answer: answer && {
        kind: answer.kind,
        reason: answer.reason,
        note: answer.note,
        pick: answer.pick_start_at && answer.pick_end_at ? { start: new Date(answer.pick_start_at), end: new Date(answer.pick_end_at) } : null,
      },
      picks,
    };
    return stored;
}

export const inviteStore: InviteStore = {
  findByTokenHash: (tokenHash) => findOne({ token_hash: tokenHash }),
  findForInvitee: (inviteId, userId) => findOne({ id: inviteId, invitee_user_id: userId }),

  async saveAnswer(inviteId, answer, timeVersion, answeredAt) {
    const { error } = await adminClient()
      .from("answers")
      .upsert(
        {
          invite_id: inviteId,
          kind: answer.kind,
          reason: answer.reason,
          note: answer.note,
          pick_start_at: answer.pick?.start.toISOString() ?? null,
          pick_end_at: answer.pick?.end.toISOString() ?? null,
          time_version: timeVersion,
          answered_at: answeredAt.toISOString(),
        },
        { onConflict: "invite_id" },
      );
    if (error) throw new Error(`saveAnswer failed: ${error.code}`);
  },
};

export type HomeInvite = {
  inviteId: string;
  organizerFirstName: string;
  title: string;
  mode: import("@/lib/rules/types").TimeMode;
  confirmed: boolean;
  zone: string;
  start: Date | null;
  end: Date | null;
  placeName: string | null;
  myAnswer: AnswerKind | null;
};

type HomeInviteRow = {
  id: string;
  playdates: {
    title: string;
    mode: TimeMode;
    status: PlaydateStatus;
    timezone: string;
    start_at: string | null;
    end_at: string | null;
    final_start_at: string | null;
    final_end_at: string | null;
    place_name: string | null;
    time_version: number;
    links_expire_at: string;
    profiles: { first_name: string } | null;
  } | null;
  answers: { kind: AnswerKind; time_version: number } | null;
};

/**
 * T15: the invites a Kindred parent received, for their Home, while open (not cancelled, link not over). Only their own invites
 * (`invitee_user_id`), and only what the invite page would show them anyway.
 */
export async function listInvitesForUser(userId: string, now: Date): Promise<HomeInvite[]> {
  const { data, error } = await adminClient()
    .from("invites")
    .select("id, playdates(title, mode, status, timezone, start_at, end_at, final_start_at, final_end_at, place_name, time_version, links_expire_at, profiles(first_name)), answers(kind, time_version)")
    .eq("invitee_user_id", userId)
    .order("created_at", { ascending: false })
    .overrideTypes<HomeInviteRow[], { merge: false }>();
  if (error) throw new Error(`listInvitesForUser failed: ${error.code}`);
  return (data ?? []).flatMap((r): HomeInvite[] => {
    const p = r.playdates;
    if (!p || p.status === "cancelled" || new Date(p.links_expire_at) <= now) return [];
    const confirmed = p.status === "confirmed";
    return [
      {
        inviteId: r.id,
        organizerFirstName: p.profiles?.first_name ?? "",
        title: p.title,
        mode: p.mode,
        confirmed,
        zone: p.timezone,
        start: date(confirmed ? p.final_start_at : p.start_at),
        end: date(confirmed ? p.final_end_at : p.end_at),
        placeName: p.place_name,
        myAnswer: r.answers && r.answers.time_version === p.time_version ? r.answers.kind : null,
      },
    ];
  });
}
