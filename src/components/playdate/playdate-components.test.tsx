// The organizer's playdate page and the invite page's confirmed state, rendered to HTML (no browser).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InvitePage } from "@/components/invite/InvitePage";
import { confirmationTexts } from "@/lib/domain/confirmation";
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
  return renderToStaticMarkup(<PlaydatePage playdate={pd} view={view} live={<span> · Live</span>} texts={view.confirmed ? confirmationTexts(pd) : []} />);
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
    expect(html).not.toContain("Confirm and send update");
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
  };
  it("shows the It's on! bubble and the CONFIRMED band, and still takes answers (KD-07m)", () => {
    const html = renderToStaticMarkup(<InvitePage view={view} token="AAAAAAAAAAAAAAAAAAAAAA" />);
    expect(html).toContain("It&#x27;s on! 🎉 See you Mon, Nov 16, 10:00 AM to 12:00 PM at High Park.");
    expect(html).toContain("Confirmed");
    expect(html).toContain("We&#x27;re in!");
    expect(renderToStaticMarkup(<InvitePage view={{ ...view, confirmed: false }} token="AAAAAAAAAAAAAAAAAAAAAA" />)).not.toContain("It&#x27;s on!");
  });
});
