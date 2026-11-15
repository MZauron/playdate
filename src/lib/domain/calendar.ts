// Add to calendar (T22): one confirmed playdate as an iCalendar file (RFC 5545), which iPhone, Google and Outlook calendars open.
// Pure: the caller passes the moment the file is made. Only after confirmation, with the final time (KD-09).

export type CalendarEvent = {
  /** Stable per playdate, so adding it twice updates one event instead of making two. */
  uid: string;
  title: string;
  start: Date;
  end: Date;
  placeName: string | null;
  placeAddress: string | null;
  /** The organizer's message, exactly as written (KD-05). */
  message: string;
};

/** 20261116T150000Z */
function utc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 §3.3.11: backslash, semicolon, comma and line breaks are escaped in text values. */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

/** RFC 5545 §3.1: lines longer than 75 octets continue on the next line after CRLF and a space, never inside a character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space, which counts
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(event: CalendarEvent, now: Date): string {
  const location = [event.placeName, event.placeAddress].filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kindred//Playdates//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(event.start)}`,
    `DTEND:${utc(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    `DESCRIPTION:${escapeText(event.message)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** The invitee's event: only once confirmed, and not after a cancellation or once the link is over. One UID per invite link. */
export function inviteEvent(
  view: { confirmed: boolean; state: string; start: Date | null; end: Date | null; title: string; placeName: string | null; placeAddress: string | null; message: string },
  tokenHash: string,
): CalendarEvent | null {
  if (!view.confirmed || view.state === "cancelled" || view.state === "over" || !view.start || !view.end) return null;
  return { uid: `${tokenHash.slice(0, 32)}@kindred`, title: view.title, start: view.start, end: view.end, placeName: view.placeName, placeAddress: view.placeAddress, message: view.message };
}

/** The organizer's event: only once confirmed. */
export function organizerEvent(p: {
  id: string;
  status: string;
  finalStartAt: Date | null;
  finalEndAt: Date | null;
  title: string;
  placeName: string | null;
  placeAddress: string | null;
  message: string;
}): CalendarEvent | null {
  if (p.status !== "confirmed" || !p.finalStartAt || !p.finalEndAt) return null;
  return { uid: `${p.id}@kindred`, title: p.title, start: p.finalStartAt, end: p.finalEndAt, placeName: p.placeName, placeAddress: p.placeAddress, message: p.message };
}

/** The HTTP response for a calendar file: a download named after nothing personal. */
export function icsResponse(ics: string): Response {
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="playdate.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
