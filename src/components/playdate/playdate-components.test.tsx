// The organizer's playdate page and the invite page's confirmed state, rendered to HTML (no browser).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InvitePage } from "@/components/invite/InvitePage";
import { cancellationTexts, confirmationTexts } from "@/lib/domain/confirmation";
import type { InviteView } from "@/lib/domain/invite-page";
import { pageView, type OrganizerPlaydate } from "@/lib/domain/playdate-page";
import { at } from "@/lib/rules/time";
import { PlaydatePage } from "./PlaydatePage";

const ZONE = "America/Toronto";
const NOW = at("2026-11-14", 10, 0, ZONE);
const p = (patch: Partial<OrganizerPlaydate> = {}): OrganizerPlaydate => ({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "Playdate: Mia & Arjun",
  mode: "set_time",
  status: "collecting",
  timezone: ZONE,
  startAt: at("2026-11-16", 10, 0, ZONE),
  endAt: at("2026-11-16", 12, 0, ZONE),
  finalStartAt: null,
  finalEndAt: null,
  confirmedAt: null,
  placeName: "High Park",
  placeAddress: null,
  searchedPlace: null,
  message: "Park?",
  timeVersion: 1,
  slots: [],
  invites: [{ id: "i1", friendId: "f1", parentName: "Dev Patel", label: "Arjun's dad", channel: "text", answer: { kind: "yes", reason: null, note: null, answeredAt: NOW } }],
  ...patch,
});
const render = (pd: OrganizerPlaydate) => {
  const view = pageView(pd);
  const texts = view.cancelled ? cancellationTexts(pd) : view.confirmed ? confirmationTexts(pd) : [];
  return renderToStaticMarkup(<PlaydatePage playdate={pd} view={view} live={<span> · Live</span>} texts={texts} />);
};

describe("PlaydatePage", () => {
  it("collecting: N of M answered · Live, the status per friend, who can come, and Confirm · the time (T44)", () => {
    const html = render(p());
    expect(html).toContain("1 of 1 answered<span> · Live</span>");
    expect(html).toContain("Arjun&#x27;s dad");
    expect(html).toContain("Coming");
    expect(html).toContain("1 family can come: Dev");
    expect(html).toMatch(/<button type="submit"[^>]*>Confirm · Mon, Nov 16, 10 to 12<\/button>/);
    expect(html).not.toContain("sms:");
  });

  it("confirmed: ✓ Update sent with a Text button per family, and no Confirm button", () => {
    const html = render(p({ status: "confirmed", finalStartAt: at("2026-11-16", 10, 0, ZONE), finalEndAt: at("2026-11-16", 12, 0, ZONE), confirmedAt: NOW }));
    expect(html).toContain("✓ Update sent");
    expect(html).toContain("Share with Dev");
    expect(html).not.toMatch(/sms:|\+1\d{10}/);
    expect(html).toContain('href="/playdates/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/calendar.ics"');
    expect(html).not.toContain(">Confirm ·");
  });
});

describe("PlaydatePage once cancelled (KD-15)", () => {
  it("says so, offers a Share button per family (the text itself is tested in playdate-page.test), and no Confirm, Edit or Cancel", () => {
    const html = render(p({ status: "cancelled" }));
    expect(html).toContain("This playdate was cancelled.");
    expect(html).toContain("Share with Dev");
    expect(html).not.toContain(">Confirm ·");
    expect(html).not.toContain("Edit playdate");
    expect(html).not.toContain(">Cancel playdate<");
  });
  it("a live playdate offers Edit playdate and Cancel playdate", () => {
    const html = render(p());
    expect(html).toContain("Edit playdate");
    expect(html).toContain("Cancel playdate");
  });
});

describe("InvitePage once confirmed", () => {
  const view: InviteView = {
    state: "open",
    organizerFirstName: "Alex",
    organizerChild: "Mia",
    title: "Playdate: Mia & Arjun",
    label: "none",
    message: "Park?",
    mode: "set_time",
    zone: ZONE,
    start: at("2026-11-16", 10, 0, ZONE),
    end: at("2026-11-16", 12, 0, ZONE),
    confirmed: true,
    placeName: "High Park",
    placeAddress: null,
    placeFacts: null,
    timeVersion: 1,
    answer: null,
    slots: [],
    picks: [],
  };
  it("shows the It's on! bubble and the CONFIRMED band, and still takes answers (KD-07m)", () => {
    const html = renderToStaticMarkup(<InvitePage view={view} inviteKey={{ token: "AAAAAAAAAAAAAAAAAAAAAA" }} />);
    expect(html).toContain("It&#x27;s on! 🎉 See you Mon, Nov 16, 10:00 AM to 12:00 PM at High Park.");
    expect(html).toContain("Confirmed");
    expect(html).toContain("We&#x27;re in!");
    expect(html).toContain('href="/r/AAAAAAAAAAAAAAAAAAAAAA/calendar.ics"');
    expect(renderToStaticMarkup(<InvitePage view={{ ...view, confirmed: false }} inviteKey={{ token: "AAAAAAAAAAAAAAAAAAAAAA" }} />)).not.toContain("calendar.ics");
    expect(renderToStaticMarkup(<InvitePage view={{ ...view, confirmed: false }} inviteKey={{ token: "AAAAAAAAAAAAAAAAAAAAAA" }} />)).not.toContain("It&#x27;s on!");
  });
});

describe("one-tap confirm (T44, KD-09 unchanged)", () => {
  const pick = (id: string, name: string, start: number, end: number) => ({
    id,
    friendId: `f-${id}`,
    parentName: name,
    label: name,
    channel: "text" as const,
    answer: { kind: "pick" as const, reason: null, note: null, answeredAt: NOW, pick: { start: at("2026-11-21", start, 0, ZONE), end: at("2026-11-21", end, 0, ZONE) } },
  });
  const availability = (invites: OrganizerPlaydate["invites"]) =>
    p({ mode: "availability", startAt: null, endAt: null, slots: [{ day: "2026-11-21", slot: "morning" }, { day: "2026-11-21", slot: "afternoon" }], invites });

  it("chooses the time most families can make, shows each time as a chip, and names it on the one button", () => {
    const html = render(availability([pick("i1", "Dev Patel", 13, 15), pick("i2", "Maya Chen", 10, 12), pick("i3", "Aisha Khan", 10, 12)]));
    expect(html).toMatch(/aria-checked="true"[^>]*>Sat, Nov 21, 10 to 12 · 2 coming</);
    expect(html).toMatch(/aria-checked="false"[^>]*>Sat, Nov 21, 1 to 3 · 1 coming</);
    expect(html).toContain('aria-label="Sat, Nov 21, 10:00 AM to 12:00 PM, Maya, Aisha"');
    expect(html).toMatch(/<button type="submit"[^>]*>Confirm · Sat, Nov 21, 10 to 12<\/button>/);
    expect(html).toContain(`name="chosenStart" value="${at("2026-11-21", 10, 0, ZONE).toISOString()}"`);
  });

  it("a tie goes to the earliest", () => {
    const html = render(availability([pick("i1", "Dev Patel", 13, 15), pick("i2", "Maya Chen", 10, 12)]));
    expect(html).toMatch(/aria-checked="true"[^>]*>Sat, Nov 21, 10 to 12 · 1 coming</);
  });

  it("a set time with no yes yet: the button names the time but stays off (CONFIRM_NEEDS_YES)", () => {
    const html = render(p({ invites: [{ ...p().invites[0]!, answer: null }] }));
    expect(html).toMatch(/<button type="submit"[^>]*disabled=""[^>]*>Confirm · Mon, Nov 16, 10 to 12<\/button>/);
    expect(html).toContain("Nobody can come yet.");
  });
});
