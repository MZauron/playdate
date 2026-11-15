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
  message: "Park?",
  timeVersion: 1,
  slots: [],
  invites: [{ id: "i1", friendId: "f1", parentName: "Dev Patel", label: "Arjun's dad", channel: "text", phoneE164: "+14165550111", answer: { kind: "yes", reason: null, note: null, answeredAt: NOW } }],
  ...patch,
});
const render = (pd: OrganizerPlaydate) => {
  const view = pageView(pd);
  const texts = view.cancelled ? cancellationTexts(pd) : view.confirmed ? confirmationTexts(pd) : [];
  return renderToStaticMarkup(<PlaydatePage playdate={pd} view={view} live={<span> · Live</span>} texts={texts} />);
};

describe("PlaydatePage", () => {
  it("collecting: N of M answered · Live, the status per friend, who can come, and Confirm and send update", () => {
    const html = render(p());
    expect(html).toContain("1 of 1 answered<span> · Live</span>");
    expect(html).toContain("Arjun&#x27;s dad");
    expect(html).toContain("Coming");
    expect(html).toContain("1 family can come: Dev");
    expect(html).toContain("Confirm and send update");
    expect(html).not.toContain("sms:");
  });

  it("confirmed: ✓ Update sent with a Text button per family, and no Confirm button", () => {
    const html = render(p({ status: "confirmed", finalStartAt: at("2026-11-16", 10, 0, ZONE), finalEndAt: at("2026-11-16", 12, 0, ZONE), confirmedAt: NOW }));
    expect(html).toContain("✓ Update sent");
    expect(html).toContain("Text Dev");
    expect(html).toContain("sms:+14165550111?&amp;body=");
    expect(html).toContain('href="/playdates/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/calendar.ics"');
    expect(html).not.toContain("Confirm and send update");
  });
});

describe("PlaydatePage once cancelled (KD-15)", () => {
  it("says so, offers a Text button per family, and no Confirm, Edit or Cancel", () => {
    const html = render(p({ status: "cancelled" }));
    expect(html).toContain("This playdate was cancelled.");
    expect(html).toContain("Sorry, our playdate on Mon, Nov 16 is cancelled.".replace(/'/g, "&#x27;").split(" ").map(encodeURIComponent).join("%20"));
    expect(html).toContain("Text Dev");
    expect(html).not.toContain("Confirm and send update");
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
