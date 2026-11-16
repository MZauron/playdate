// Texts come from the organizer's own phone (DESIGN.md "Platform"): Kindred hands the text to the phone's share sheet (Q26, T33) and
// the parent picks who gets it from their own contacts. Kindred keeps no friend's phone number.
// The body is the parent's message exactly as typed, then a blank line and the link. Nothing else is added (KD-05).

/** The text a friend gets: the message, then their own link. */
export function textBody(message: string, link: string): string {
  return `${message}\n\n${link}`;
}
