// The organizer's playdate page (T10). Server only; every query is scoped to the organizer id the caller got from `auth.getUser()`.
import "server-only";
import type { OrganizerPlaydate, PlaydatePageStore } from "@/lib/domain/playdate-page";
import type { AnswerKind, DaySlot, DeclineReason, InviteChannel, PlaydateStatus, TimeMode } from "@/lib/rules/types";
import { adminClient } from "./admin";

type Row = {
  id: string;
  title: string;
  mode: TimeMode;
  status: PlaydateStatus;
  timezone: string;
  start_at: string | null;
  end_at: string | null;
  final_start_at: string | null;
  final_end_at: string | null;
  confirmed_at: string | null;
  place_name: string | null;
  place_address: string | null;
  message: string;
  time_version: number;
  availability_slots: { day: string; slot: DaySlot }[];
  invites: {
    id: string;
    friend_id: string;
    channel: InviteChannel;
    created_at: string;
    majority_notice_at: string | null;
    friends: { parent_name: string; label: string; phone_e164: string } | null;
    answers: { kind: AnswerKind; reason: DeclineReason | null; note: string | null; answered_at: string; pick_start_at: string | null; pick_end_at: string | null; time_version: number } | null;
  }[];
};

const date = (value: string | null) => (value ? new Date(value) : null);

export const playdatePageStore: PlaydatePageStore = {
  async getForOrganizer(organizerId, playdateId) {
    const { data, error } = await adminClient()
      .from("playdates")
      .select(
        "id, title, mode, status, timezone, start_at, end_at, final_start_at, final_end_at, confirmed_at, place_name, place_address, message, time_version, availability_slots(day, slot), invites(id, friend_id, channel, created_at, majority_notice_at, friends(parent_name, label, phone_e164), answers(kind, reason, note, answered_at, pick_start_at, pick_end_at, time_version))",
      )
      .eq("id", playdateId)
      .eq("organizer_id", organizerId)
      .maybeSingle()
      .overrideTypes<Row, { merge: false }>();
    if (error) throw new Error(`getForOrganizer failed: ${error.code}`);
    if (!data) return null;
    const invites = [...data.invites].sort((a, b) => a.created_at.localeCompare(b.created_at) || (a.friends?.label ?? "").localeCompare(b.friends?.label ?? "") || a.id.localeCompare(b.id));
    const playdate: OrganizerPlaydate = {
      id: data.id,
      title: data.title,
      mode: data.mode,
      status: data.status,
      timezone: data.timezone,
      startAt: date(data.start_at),
      endAt: date(data.end_at),
      finalStartAt: date(data.final_start_at),
      finalEndAt: date(data.final_end_at),
      confirmedAt: date(data.confirmed_at),
      placeName: data.place_name,
      placeAddress: data.place_address,
      message: data.message,
      timeVersion: data.time_version,
      slots: data.availability_slots,
      invites: invites.map((i) => {
        const a = i.answers && i.answers.time_version === data.time_version ? i.answers : null;
        return {
          id: i.id,
          friendId: i.friend_id,
          label: i.friends?.label ?? "",
          parentName: i.friends?.parent_name ?? "",
          channel: i.channel,
          phoneE164: i.friends?.phone_e164 ?? "",
          answer: a && {
            kind: a.kind,
            reason: a.reason,
            note: a.note,
            answeredAt: new Date(a.answered_at),
            pick: a.pick_start_at && a.pick_end_at ? { start: new Date(a.pick_start_at), end: new Date(a.pick_end_at) } : null,
          },
          majorityNoticeAt: date(i.majority_notice_at),
        };
      }),
    };
    return playdate;
  },

  async confirm(organizerId, playdateId, final) {
    const { data, error } = await adminClient()
      .from("playdates")
      .update({
        status: "confirmed",
        final_start_at: final.start.toISOString(),
        final_end_at: final.end.toISOString(),
        confirmed_at: final.confirmedAt.toISOString(),
        links_expire_at: final.linksExpireAt.toISOString(),
      })
      .eq("id", playdateId)
      .eq("organizer_id", organizerId)
      .eq("status", "collecting")
      .select("id");
    if (error) throw new Error(`confirm failed: ${error.code}`);
    return (data?.length ?? 0) > 0;
  },

  async cancel(organizerId, playdateId, cancelledAt) {
    const { data, error } = await adminClient()
      .from("playdates")
      .update({ status: "cancelled", cancelled_at: cancelledAt.toISOString() })
      .eq("id", playdateId)
      .eq("organizer_id", organizerId)
      .neq("status", "cancelled")
      .select("id");
    if (error) throw new Error(`cancel failed: ${error.code}`);
    return (data?.length ?? 0) > 0;
  },
};

/** This organizer's collecting availability playdates whose links are still open, for Home's KD-12 notices. */
export async function listOpenAvailability(organizerId: string, now: Date) {
  const { data, error } = await adminClient()
    .from("playdates")
    .select("id")
    .eq("organizer_id", organizerId)
    .eq("mode", "availability")
    .eq("status", "collecting")
    .gt("links_expire_at", now.toISOString());
  if (error) throw new Error(`listOpenAvailability failed: ${error.code}`);
  const found = await Promise.all((data ?? []).map((p) => playdatePageStore.getForOrganizer(organizerId, p.id)));
  return found.filter((p): p is NonNullable<typeof p> => p !== null);
}
