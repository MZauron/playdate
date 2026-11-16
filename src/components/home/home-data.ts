// What the Home screen needs about each playdate. The repository (T08) fills it; each one's status and the list's order come from
// src/lib/rules/home.ts (KD-13, Q24: one list, soonest first).
import type { HomeInvite } from "@/lib/db/invites";
import { homeSortKey, homeStatus, type HomeStatus } from "@/lib/rules/home";
import type { AnswerKind, PlaydateStatus, TimeMode } from "@/lib/rules/types";

export type HomePlaydate = {
  id: string;
  title: string;
  mode: TimeMode;
  status: PlaydateStatus;
  /** The playdate's zone (KD-16). */
  timezone: string;
  /** The final start once confirmed, else the set start; null for an availability playdate nobody has confirmed. */
  start: Date | null;
  /** The playdate's end (`playdateEnd` in src/lib/rules/links.ts). */
  end: Date;
  confirmedAt: Date | null;
  placeName: string | null;
  inviteCount: number;
  /** Current answers (this `time_version`), one per answered invite. */
  answers: readonly { kind: AnswerKind; answeredAt: Date }[];
  /** First letters of the invited friends' names, for the little circles. */
  friendInitials: readonly string[];
};

export type HomeItem = { kind: "playdate"; playdate: HomePlaydate; status: HomeStatus } | { kind: "invite"; invite: HomeInvite };

/** KD-13: the parent's own playdates still on Home and the invites they received, in one list, soonest first. */
export function homeList(playdates: readonly HomePlaydate[], invites: readonly HomeInvite[], now: Date): HomeItem[] {
  const items: HomeItem[] = [];
  for (const playdate of playdates) {
    const status = homeStatus(playdate, now);
    if (status) items.push({ kind: "playdate", playdate, status });
  }
  for (const invite of invites) items.push({ kind: "invite", invite });
  const key = (i: HomeItem) => homeSortKey(i.kind === "playdate" ? i.playdate : i.invite);
  return items.sort((a, b) => key(a) - key(b)); // stable: equal times keep the parent's own playdates first
}
