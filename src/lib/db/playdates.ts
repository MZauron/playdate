// Playdates, invites and typed saved places (T08). Server only; every query is scoped to the organizer id the caller got from
// `auth.getUser()`.
import "server-only";
import type { HomePlaydate } from "@/components/home/home-data";
import type { InviteeFriend, PlaydateStore } from "@/lib/domain/playdates";
import { playdateEnd } from "@/lib/rules/links";
import type { AnswerKind, DaySlot, PlaydateStatus, TimeMode } from "@/lib/rules/types";
import { adminClient } from "./admin";

export const playdateStore: PlaydateStore = {
  async friendsForInvite(ownerId, friendIds) {
    const { data, error } = await adminClient()
      .from("friends")
      .select("id, parent_name, child_first_name, label, phone_e164, kindred_user_id")
      .eq("owner_id", ownerId)
      .in("id", [...friendIds])
      .order("created_at")
      .order("id");
    if (error) throw new Error(`friendsForInvite failed: ${error.code}`);
    return (data ?? []).map(
      (row): InviteeFriend => ({
        id: row.id,
        parentName: row.parent_name,
        childFirstName: row.child_first_name,
        label: row.label,
        phoneE164: row.phone_e164,
        kindredUserId: row.kindred_user_id,
      }),
    );
  },

  async createPlaydate(p) {
    const { data, error } = await adminClient().rpc("create_playdate_with_invites", {
      p_playdate: {
        organizer_id: p.organizerId,
        title: p.title,
        mode: p.mode,
        timezone: p.timezone,
        start_at: p.startAt?.toISOString() ?? null,
        end_at: p.endAt?.toISOString() ?? null,
        slots: p.slots,
        place_name: p.placeName,
        place_address: p.placeAddress,
        message: p.message,
        links_expire_at: p.linksExpireAt.toISOString(),
      },
      p_invites: p.invites.map((i) => ({ friend_id: i.friendId, invitee_user_id: i.inviteeUserId, channel: i.channel, token_hash: i.tokenHash })),
    });
    if (error || !data) throw new Error(`createPlaydate failed: ${error?.code}`);
    return data;
  },

  async saveTypedPlace(ownerId, name, address) {
    const { error } = await adminClient().from("saved_places").insert({ owner_id: ownerId, source: "typed", name, address });
    // 23505: this owner already saved a typed place with that name; the first one stays.
    if (error && error.code !== "23505") throw new Error(`saveTypedPlace failed: ${error.code}`);
  },

  async setFirstName(ownerId, firstName) {
    const { error } = await adminClient().from("profiles").update({ first_name: firstName }).eq("id", ownerId);
    if (error) throw new Error(`setFirstName failed: ${error.code}`);
  },
};

export type TypedPlace = { name: string; address: string };

/** The owner's typed saved places, for the suggestions under Place. */
export async function listTypedPlaces(ownerId: string): Promise<TypedPlace[]> {
  const { data, error } = await adminClient()
    .from("saved_places")
    .select("name, address")
    .eq("owner_id", ownerId)
    .eq("source", "typed")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`listTypedPlaces failed: ${error.code}`);
  return (data ?? []).map((p) => ({ name: p.name, address: p.address ?? "" }));
}

type HomeRow = {
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
  time_version: number;
  availability_slots: { day: string; slot: DaySlot }[];
  invites: { friends: { parent_name: string } | null; answers: { kind: AnswerKind; answered_at: string; time_version: number } | null }[];
};

const date = (value: string | null) => (value ? new Date(value) : null);

/** The playdates this parent organizes whose links are still open, as Home shows them (KD-13 sorts them into sections). */
export async function listHomePlaydates(organizerId: string, now: Date): Promise<HomePlaydate[]> {
  const { data, error } = await adminClient()
    .from("playdates")
    .select(
      "id, title, mode, status, timezone, start_at, end_at, final_start_at, final_end_at, confirmed_at, place_name, time_version, availability_slots(day, slot), invites(friends(parent_name), answers(kind, answered_at, time_version))",
    )
    .eq("organizer_id", organizerId)
    .neq("status", "cancelled")
    .gt("links_expire_at", now.toISOString())
    .order("created_at", { ascending: false })
    .overrideTypes<HomeRow[], { merge: false }>();
  if (error) throw new Error(`listHomePlaydates failed: ${error.code}`);
  return (data ?? []).flatMap((row): HomePlaydate[] => {
    const end = playdateEnd({ finalEnd: date(row.final_end_at), setEnd: date(row.end_at), slots: row.availability_slots, zone: row.timezone });
    if (!end) return [];
    const answers = row.invites.flatMap((i) => (i.answers && i.answers.time_version === row.time_version ? [i.answers] : []));
    return [
      {
        id: row.id,
        title: row.title,
        mode: row.mode,
        status: row.status,
        timezone: row.timezone,
        start: date(row.final_start_at) ?? date(row.start_at),
        end,
        confirmedAt: date(row.confirmed_at),
        placeName: row.place_name,
        inviteCount: row.invites.length,
        answers: answers.map((a) => ({ kind: a.kind, answeredAt: new Date(a.answered_at) })),
        friendInitials: row.invites.map((i) => (i.friends?.parent_name.trim()[0] ?? "?").toUpperCase()),
      },
    ];
  });
}

/** The children's first names of THIS owner's friends among these ids, for the built-in message ideas. */
export async function friendsChildren(ownerId: string, friendIds: readonly string[]): Promise<string[]> {
  const friends = await playdateStore.friendsForInvite(ownerId, friendIds);
  return friends.map((f) => f.childFirstName).filter((n): n is string => !!n);
}

/** Applies one Send update in a single transaction (migration 0004), on THIS organizer's playdate only. */
export const applyPlaydateUpdate: import("@/lib/domain/edit-playdate").ApplyUpdate = async (organizerId, playdateId, u) => {
  const { error } = await adminClient().rpc("update_playdate", {
    p_playdate_id: playdateId,
    p_organizer_id: organizerId,
    p_playdate: {
      title: u.title,
      mode: u.mode,
      start_at: u.startAt?.toISOString() ?? null,
      end_at: u.endAt?.toISOString() ?? null,
      slots: u.slots,
      place_name: u.placeName,
      place_address: u.placeAddress,
      message: u.message,
      links_expire_at: u.linksExpireAt.toISOString(),
      time_version: u.timeVersion,
      status: u.status,
      clear_final: u.clearFinal,
    },
    p_add: u.add.map((i) => ({ friend_id: i.friendId, invitee_user_id: i.inviteeUserId, channel: i.channel, token_hash: i.tokenHash })),
    p_remove: u.removeFriendIds,
    p_delete_answers: u.deleteAnswers,
    // The generated type says string; null (leave the labels) is what the function expects when nothing but the time is the same.
    p_label: u.label as "updated" | "new_time",
  });
  if (error) throw new Error(`applyPlaydateUpdate failed: ${error.code}`);
};
