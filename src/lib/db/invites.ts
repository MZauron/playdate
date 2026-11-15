// The invite page's store (T09). Server only. A friend without an account has no session: the ONLY key is the sha256 of the link
// token, and every query is scoped to the one invite it matches. Nothing here selects a phone number, a hash or another invite.
import "server-only";
import type { InviteStore, StoredInvite } from "@/lib/domain/invite-page";
import type { AnswerKind, DaySlot, DeclineReason, InviteLabel, PlaydateStatus, TimeMode } from "@/lib/rules/types";
import { adminClient } from "./admin";

type Row = {
  id: string;
  label: InviteLabel;
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
    place_address: string | null;
    message: string;
    time_version: number;
    links_expire_at: string;
    organizer_id: string;
    profiles: { first_name: string } | null;
    availability_slots: { day: string; slot: DaySlot }[];
  } | null;
  answers: { kind: AnswerKind; reason: DeclineReason | null; note: string | null; time_version: number } | null;
};

const date = (value: string | null) => (value ? new Date(value) : null);

export const inviteStore: InviteStore = {
  async findByTokenHash(tokenHash) {
    const db = adminClient();
    const { data, error } = await db
      .from("invites")
      .select(
        "id, label, playdates(title, mode, status, timezone, start_at, end_at, final_start_at, final_end_at, place_name, place_address, message, time_version, links_expire_at, organizer_id, profiles(first_name), availability_slots(day, slot)), answers(kind, reason, note, time_version)",
      )
      .eq("token_hash", tokenHash)
      .maybeSingle()
      .overrideTypes<Row, { merge: false }>();
    if (error) throw new Error(`findByTokenHash failed: ${error.code}`);
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
      answer: answer && { kind: answer.kind, reason: answer.reason, note: answer.note },
    };
    return stored;
  },

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
