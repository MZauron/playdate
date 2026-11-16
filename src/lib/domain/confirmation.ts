// KD-09: after Confirm and send update, the organizer texts each family the news from their own phone (Q3). The text is Kindred's
// own short sentence with the final day, time and place; it is not the parent's message, so nothing is added to theirs (KD-05).
import { enCA, formatShortDay, formatTimeRange } from "@/lib/i18n/en-CA";
import type { OrganizerPlaydate } from "./playdate-page";
import { firstWord } from "./playdates";

/** "It's on! 🎉 See you Sat, Nov 21, 10:00 AM to 12:00 PM at Riverdale Park." in the playdate's zone; null before confirmation. */
export function confirmationSentence(p: Pick<OrganizerPlaydate, "finalStartAt" | "finalEndAt" | "timezone" | "placeName">): string | null {
  if (!p.finalStartAt || !p.finalEndAt) return null;
  return enCA.itsOn(formatShortDay(p.finalStartAt, p.timezone), formatTimeRange(p.finalStartAt, p.finalEndAt, p.timezone), p.placeName);
}

/** One Text button per family, Kindred friends included (Q11 default: no push yet). */
export function confirmationTexts(p: OrganizerPlaydate) {
  const sentence = confirmationSentence(p);
  if (!sentence) return [];
  return p.invites.map((i) => ({ key: i.id, name: firstWord(i.parentName), label: i.label, channel: i.channel, body: sentence }));
}

/** KD-15: the short text that tells each family the playdate is off, with its day (the final one once confirmed). */
export function cancellationTexts(p: OrganizerPlaydate) {
  const start = p.finalStartAt ?? p.startAt;
  const sentence = enCA.cancelledText(start ? formatShortDay(start, p.timezone) : null);
  return p.invites.map((i) => ({ key: i.id, name: firstWord(i.parentName), label: i.label, channel: i.channel, body: sentence }));
}
