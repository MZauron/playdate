// Texts come from the organizer's own phone (DESIGN.md "Platform"): Kindred only opens Messages with the text filled in.
// The body is the parent's message exactly as typed, then a blank line and the link. Nothing else is added (KD-05).

/** The text a friend gets: the message, then their own link. */
export function textBody(message: string, link: string): string {
  return `${message}\n\n${link}`;
}

/**
 * An `sms:` link to one number with the body filled in. `?&body=` is the form both iPhone Messages and Android accept.
 * The number is the organizer's own friend's, inside the organizer's own browser; it is never logged.
 */
export function smsHref(phoneE164: string, message: string, link: string): string {
  return `sms:${phoneE164}?&body=${encodeURIComponent(textBody(message, link))}`;
}
