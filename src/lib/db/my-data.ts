// T55 (Q13): Download my data. What Kindred keeps about one parent, read with the service role and scoped to that parent's own id
// everywhere. Columns are named one by one, so no hash, token, account id or other parent's private data is ever in it.
import "server-only";
import { adminClient } from "./admin";

const fail = (what: string, error: { code: string } | null) => {
  if (error) throw new Error(`myData ${what} failed: ${error.code}`);
};

type AnswerRow = { kind: string; reason: string | null; note: string | null; pick_start_at: string | null; pick_end_at: string | null; answered_at: string } | null;
const answerOf = (a: AnswerRow) =>
  a ? { kind: a.kind, reason: a.reason, note: a.note, pickStart: a.pick_start_at, pickEnd: a.pick_end_at, answeredAt: a.answered_at } : null;

export async function myData(parentId: string, now: Date) {
  const db = adminClient();
  const [profile, children, friends, groups, places, free, planned, received] = await Promise.all([
    db.from("profiles").select("first_name, created_at").eq("id", parentId).maybeSingle(),
    db.from("children").select("id, first_name, age_label").eq("parent_id", parentId).order("sort"),
    db.from("friends").select("id, parent_name, child_first_name, label, kindred_user_id, created_at, friend_children(child_id)").eq("owner_id", parentId).order("created_at"),
    db.from("groups").select("name, created_at, group_members(friend_id)").eq("owner_id", parentId).order("created_at"),
    db.from("saved_places").select("name, address, provider_place_id, is_favourite, created_at").eq("owner_id", parentId).order("created_at"),
    db.from("free_statuses").select("child_id, kind, words, until").eq("parent_id", parentId),
    db
      .from("playdates")
      .select(
        "title, mode, status, timezone, start_at, end_at, final_start_at, final_end_at, place_name, place_address, place_provider_id, message, created_at, invites(friend_id, channel, answers(kind, reason, note, pick_start_at, pick_end_at, answered_at))",
      )
      .eq("organizer_id", parentId)
      .order("created_at"),
    db
      .from("invites")
      .select("created_at, playdates(title, status, timezone, start_at, end_at, final_start_at, final_end_at, profiles(first_name)), answers(kind, reason, note, pick_start_at, pick_end_at, answered_at)")
      .eq("invitee_user_id", parentId)
      .order("created_at"),
  ]);
  for (const [what, r] of Object.entries({ profile, children, friends, groups, places, free, planned, received })) fail(what, r.error);

  const kidName = new Map((children.data ?? []).map((c) => [c.id, c.first_name]));
  const friendLabel = new Map((friends.data ?? []).map((f) => [f.id, f.label]));
  return {
    exportedAt: now.toISOString(),
    profile: profile.data ? { firstName: profile.data.first_name, createdAt: profile.data.created_at } : null,
    children: (children.data ?? []).map((c) => ({ firstName: c.first_name, age: c.age_label })),
    friends: (friends.data ?? []).map((f) => ({
      name: f.parent_name,
      childFirstName: f.child_first_name,
      label: f.label,
      onKindred: f.kindred_user_id !== null,
      friendsWith: (f.friend_children ?? []).map((k) => kidName.get(k.child_id)).filter(Boolean),
      addedAt: f.created_at,
    })),
    groups: (groups.data ?? []).map((g) => ({ name: g.name, members: (g.group_members ?? []).map((m) => friendLabel.get(m.friend_id)).filter(Boolean), createdAt: g.created_at })),
    savedPlaces: (places.data ?? []).map((p) => ({ name: p.name, address: p.address, providerPlaceId: p.provider_place_id, favourite: p.is_favourite, savedAt: p.created_at })),
    freeToPlay: (free.data ?? []).map((s) => ({ child: kidName.get(s.child_id) ?? null, kind: s.kind, words: s.words, until: s.until })),
    playdatesYouPlanned: (planned.data ?? []).map((p) => ({
      title: p.title,
      mode: p.mode,
      status: p.status,
      timezone: p.timezone,
      start: p.final_start_at ?? p.start_at,
      end: p.final_end_at ?? p.end_at,
      place: { name: p.place_name, address: p.place_address, providerPlaceId: p.place_provider_id },
      message: p.message,
      createdAt: p.created_at,
      invited: (p.invites ?? []).map((i) => ({ friend: friendLabel.get(i.friend_id) ?? null, channel: i.channel, answer: answerOf(i.answers as AnswerRow) })),
    })),
    invitesYouGot: (received.data ?? []).flatMap((i) => {
      const p = i.playdates as { title: string; status: string; timezone: string; start_at: string | null; end_at: string | null; final_start_at: string | null; final_end_at: string | null; profiles: { first_name: string } | null } | null;
      if (!p) return [];
      return [{ title: p.title, from: p.profiles?.first_name ?? null, status: p.status, timezone: p.timezone, start: p.final_start_at ?? p.start_at, end: p.final_end_at ?? p.end_at, yourAnswer: answerOf(i.answers as AnswerRow), invitedAt: i.created_at }];
    }),
  };
}

export type MyData = Awaited<ReturnType<typeof myData>>;
