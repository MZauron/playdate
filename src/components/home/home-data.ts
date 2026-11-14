// What the Home screen needs about each playdate. The repository (T08) fills it; the sections come from src/lib/rules/home.ts (KD-13).
import { homeSection, type HomeSection } from "@/lib/rules/home";
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

export type HomeSections = Record<HomeSection, HomePlaydate[]>;

/** KD-13: puts each playdate in its section; over and cancelled ones leave Home. Upcoming is soonest first. */
export function groupForHome(playdates: readonly HomePlaydate[], now: Date): HomeSections {
  const sections: HomeSections = { needs_you: [], upcoming: [], waiting: [] };
  for (const p of playdates) {
    const section = homeSection(p, now);
    if (section) sections[section].push(p);
  }
  sections.upcoming.sort((a, b) => (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity));
  return sections;
}
