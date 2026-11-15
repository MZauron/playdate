// The invite page rendered to HTML (no browser): what a friend sees in each state, and what it never holds.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { InviteView } from "@/lib/domain/invite-page";
import { at } from "@/lib/rules/time";
import { InvitePage } from "./InvitePage";

const ZONE = "America/Toronto";
const TOKEN = "AAAAAAAAAAAAAAAAAAAAAA";
const view = (patch: Partial<InviteView> = {}): InviteView => ({
  state: "open",
  organizerFirstName: "Alex",
  organizerChild: "Mia",
  title: "Playdate: Mia & Arjun",
  label: "none",
  message: "Park at 10?\nWe'll bring snacks.",
  mode: "set_time",
  zone: ZONE,
  start: at("2026-11-16", 10, 0, ZONE),
  end: at("2026-11-16", 12, 0, ZONE),
  confirmed: false,
  placeName: "Riverdale Park",
  placeAddress: "373 Broadview Ave",
  timeVersion: 1,
  answer: null,
  ...patch,
});
const render = (v: InviteView) => renderToStaticMarkup(<InvitePage view={v} token={TOKEN} />);

describe("InvitePage", () => {
  it("shows who invites, the message, the time in the playdate's zone, the place with Directions, and the two answers", () => {
    const html = render(view());
    expect(html).toContain("Alex · Mia&#x27;s parent");
    expect(html).toContain("Playdate: Mia &amp; Arjun");
    expect(html).toContain("Park at 10?\nWe&#x27;ll bring snacks.");
    expect(html).toContain("Monday, November 16");
    expect(html).toContain("10:00 AM to 12:00 PM");
    expect(html).toContain('href="https://www.google.com/maps/search/?api=1&amp;query=Riverdale%20Park%2C%20373%20Broadview%20Ave"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("We&#x27;re in!");
    expect(html).toContain("Can&#x27;t make it");
  });

  it("names the label when the organizer sent an update", () => {
    expect(render(view({ label: "updated" }))).toContain("Updated");
    expect(render(view({ label: "new_time" }))).toContain("New time");
  });

  it("after answering: Thanks, the answer given, and Change my answer", () => {
    const html = render(view({ answer: { kind: "no", reason: "busy", note: "Sorry!" } }));
    expect(html).toContain("Thanks! Your answer is in");
    expect(html).toContain("Your answer: Can&#x27;t make it · We&#x27;re busy then");
    expect(html).toContain("Change my answer");
    expect(html).not.toContain("We&#x27;re in!</button>");
  });

  it("a cancelled or started playdate takes no answer", () => {
    for (const state of ["cancelled", "started"] as const) {
      const html = render(view({ state }));
      expect(html).not.toContain("We&#x27;re in!");
      expect(html).toContain(state === "cancelled" ? "This playdate was cancelled." : "answers are closed");
    }
  });

  it("an expired link says the playdate is over and shows nothing else of it", () => {
    const html = render(view({ state: "over" }));
    expect(html).toContain("This playdate is over");
    expect(html).not.toContain("Park at 10?");
    expect(html).not.toContain("Riverdale Park");
    expect(html).not.toContain("We&#x27;re in!");
  });

  it("carries the link only in its own answer form, and no phone number", () => {
    const html = render(view());
    expect(html.match(new RegExp(TOKEN, "g"))?.length).toBe(1);
    expect(html).not.toMatch(/\+1\d{10}|tel:|sms:/);
  });
});
