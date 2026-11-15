import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, foldLine, inviteEvent, organizerEvent } from "./calendar";

const event = {
  uid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa@kindred",
  title: "Playdate: Mia, Arjun & Lily",
  start: new Date("2026-11-16T15:00:00Z"),
  end: new Date("2026-11-16T17:00:00Z"),
  placeName: "High Park",
  placeAddress: "1873 Bloor St W, Toronto",
  message: "Park at 10?\nWe'll bring snacks; and juice.",
};

describe("buildIcs (T22)", () => {
  it("has the final time in UTC, the place and the message, with CRLF line ends", () => {
    const ics = buildIcs(event, new Date("2026-11-14T15:00:00Z"));
    expect(ics.split("\r\n")).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Kindred//Playdates//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa@kindred",
      "DTSTAMP:20261114T150000Z",
      "DTSTART:20261116T150000Z",
      "DTEND:20261116T170000Z",
      "SUMMARY:Playdate: Mia\\, Arjun & Lily",
      "LOCATION:High Park\\, 1873 Bloor St W\\, Toronto",
      "DESCRIPTION:Park at 10?\\nWe'll bring snacks\\; and juice.",
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ]);
  });

  it("leaves out LOCATION when there is no place", () => {
    expect(buildIcs({ ...event, placeName: null, placeAddress: null }, new Date())).not.toContain("LOCATION");
  });

  it("escapes backslashes, semicolons, commas and line breaks", () => {
    expect(escapeText("a\\b;c,d\r\ne\nf")).toBe("a\\\\b\\;c\\,d\\ne\\nf");
  });

  it("folds long lines at 75 octets without splitting a character", () => {
    const line = `DESCRIPTION:${"é".repeat(60)}🎉${"x".repeat(40)}`;
    const folded = foldLine(line);
    const parts = folded.split("\r\n");
    const bytes = (s: string) => new TextEncoder().encode(s).length;
    expect(bytes(parts[0]!)).toBeLessThanOrEqual(75);
    for (const p of parts.slice(1)) {
      expect(p.startsWith(" ")).toBe(true);
      expect(bytes(p)).toBeLessThanOrEqual(75);
    }
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(line);
  });
});

describe("which playdates get a calendar file (only after confirmation)", () => {
  const view = { confirmed: true, state: "open", start: event.start, end: event.end, title: event.title, placeName: "High Park", placeAddress: null, message: "Park?" };
  it("an invite: confirmed and still open or started; never collecting, cancelled or over", () => {
    expect(inviteEvent(view, "ab".repeat(32))).toMatchObject({ uid: `${"ab".repeat(16)}@kindred`, start: event.start, end: event.end, placeName: "High Park" });
    expect(inviteEvent({ ...view, state: "started" }, "x".repeat(64))).not.toBeNull();
    expect(inviteEvent({ ...view, confirmed: false }, "x".repeat(64))).toBeNull();
    expect(inviteEvent({ ...view, state: "cancelled" }, "x".repeat(64))).toBeNull();
    expect(inviteEvent({ ...view, state: "over" }, "x".repeat(64))).toBeNull();
  });
  it("the organizer's: confirmed only, with the final time", () => {
    const p = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: "confirmed", finalStartAt: event.start, finalEndAt: event.end, title: event.title, placeName: null, placeAddress: null, message: "Park?" };
    expect(organizerEvent(p)).toMatchObject({ uid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa@kindred", start: event.start });
    expect(organizerEvent({ ...p, status: "collecting" })).toBeNull();
    expect(organizerEvent({ ...p, status: "cancelled" })).toBeNull();
  });
});
