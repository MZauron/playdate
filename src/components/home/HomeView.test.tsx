import { renderToStaticMarkup as html } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { homeList } from "./home-data";
import { HomeView } from "./HomeView";
import { cancelled, needsYou, NOW, over, upcoming, upcomingLater, waiting, ZONE } from "./fixtures";

const view = (props: Partial<Parameters<typeof HomeView>[0]> = {}) => html(<HomeView playdates={[]} now={NOW} zone={ZONE} {...props} />);
const headings = (markup: string) => [...markup.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map((m) => m[1]);
/** The playdate pages and invites linked from the list, in order. */
const order = (markup: string) => [...markup.matchAll(/href="\/(?:playdates|invites)\/([^"]+)"/g)].map((m) => m[1]);

const invite = {
  inviteId: "11111111-2222-4333-8444-555555555555",
  organizerFirstName: "Alex",
  title: "Playdate: Mia & Noor",
  mode: "set_time" as const,
  confirmed: false,
  zone: ZONE,
  start: new Date("2026-11-29T15:00:00Z"),
  end: new Date("2026-11-29T17:00:00Z"),
  placeName: "Christie Pits",
  myAnswer: null,
};
const EMPTY_NOTE = "Pick a friend, a time and a place. They answer from a text.";

describe("Home with no playdates", () => {
  it("is the banner and the Plan a playdate card with one line, nothing else (Q24)", () => {
    const markup = view();
    expect(markup).toContain("Saturday, November 14");
    expect(markup).toContain("<h1");
    expect(markup).toMatch(/href="\/plan"[^>]*>.*Plan a playdate/);
    expect(markup).toContain(EMPTY_NOTE);
    expect(headings(markup)).toEqual([]);
    expect(markup).not.toContain("<ul");
  });
  it("greets by the time of day", () => {
    expect(view()).toContain("Good morning");
  });
  it("says Welcome, Alex the first time, and names the child", () => {
    const markup = view({ firstName: "Alex", welcome: true, childName: "Mia" });
    expect(markup).toContain("Welcome, Alex");
    expect(markup).not.toContain("Good morning");
    expect(markup).toContain("Plan playdates for Mia.");
  });
  it("greets a returning parent by the time of day, not by name", () => {
    expect(view({ firstName: "Alex", childName: "Mia" })).toContain("Good morning");
  });
  it("makes the Plan card at least 44 px tall", () => {
    expect(view()).toContain("min-h-[72px]");
  });
  it("names every child in the banner (T37)", () => {
    expect(view({ childNames: ["Mia", "Ethan"] })).toContain("Plan playdates for Mia and Ethan.");
  });
});

describe("Home as one list (KD-13, Q24)", () => {
  const all = [waiting, needsYou, upcomingLater, upcoming, over, cancelled];

  it("is one list under Your playdates, soonest first, invites included", () => {
    const markup = view({ playdates: all, invites: [invite] });
    expect(headings(markup)).toEqual(["Your playdates"]);
    expect(order(markup)).toEqual(["p-needs", "p-upcoming", "p-waiting", "p-upcoming-later", invite.inviteId]);
    expect(markup).not.toContain(EMPTY_NOTE);
  });
  it("swaps the Plan card for a coral Plan another pill once the list has something (T37)", () => {
    const markup = view({ playdates: [waiting] });
    expect(markup).not.toContain("min-h-[72px]");
    expect(markup).toMatch(/<a class="[^"]*bg-accent[^"]*" href="\/plan">.*?Plan another/);
    expect(markup.match(/bg-accent/g)).toHaveLength(1);
  });
  it("leaves over and cancelled playdates off Home", () => {
    const markup = view({ playdates: all });
    expect(markup).not.toContain("p-over");
    expect(markup).not.toContain("p-cancelled");
    expect(markup.match(/<li/g)).toHaveLength(4);
  });
  it("gives each card a date tile, a tag, the title, a clock line and a pin line (T37)", () => {
    const markup = view({ playdates: [upcoming] });
    expect(markup).toContain(">Nov<");
    expect(markup).toContain(">16<");
    expect(markup).toContain("✓ Confirmed");
    expect(markup).toContain(">Mia &amp; Lily<");
    expect(markup).toContain("Monday · 9:00 AM to 12:00 PM");
    expect(markup).toContain(">Riverdale Park<");
    expect(view({ playdates: [waiting] })).toContain(">Pending<");
  });
  it("says the place is not set yet when there is none", () => {
    expect(view({ playdates: [upcomingLater] })).toContain("Place not set yet");
  });
  it("shows the host and one chip per family, first names only, with the state in words (T37, KD-17)", () => {
    const markup = view({ firstName: "Alex", playdates: [needsYou] });
    expect(markup).toContain("Host: Alex (you)");
    expect(markup).toMatch(/✓<\/span>Dev<span class="sr-only"> coming<\/span>/);
    expect(markup).toMatch(/✕<\/span>Aisha<span class="sr-only"> can&#x27;t make it<\/span>/);
    expect(view({ playdates: [waiting] })).toMatch(/Aisha<span class="sr-only"> waiting<\/span>/);
  });
  it("adds a note when a playdate needs you, and none while waiting", () => {
    expect(view({ playdates: [needsYou] })).toContain("✓ Everyone answered · tap to confirm");
    const picked = view({
      playdates: [{ ...waiting, mode: "availability", start: null, answers: [{ kind: "pick", answeredAt: NOW }, { kind: "pick", answeredAt: NOW }], families: [{ name: "Dev", answer: "pick" }, { name: "Maya", answer: "pick" }, { name: "Aisha", answer: null }] }],
    });
    expect(picked).toContain("2 families picked a time · tap to choose");
    expect(picked).toContain("Shared availability");
    expect(picked).toContain("<rect"); // the calendar icon instead of a date
    const changed = view({ playdates: [{ ...upcoming, answers: [{ kind: "no", answeredAt: NOW }], families: [{ name: "Maya", answer: "no" }] }] });
    expect(changed).toContain("Someone can&#x27;t make it now · tap to see");
    expect(view({ playdates: [waiting] })).not.toContain("tap to");
  });
  it("links each playdate to its page", () => {
    expect(view({ playdates: [needsYou] })).toContain('href="/playdates/p-needs"');
  });
});

describe("homeList (KD-13)", () => {
  it("keeps the playdates still on Home with their status, soonest first", () => {
    const list = homeList([waiting, needsYou, upcoming, over, cancelled], [], NOW);
    expect(list.map((i) => (i.kind === "playdate" ? [i.playdate.id, i.status.kind] : null))).toEqual([
      ["p-needs", "needs_you"],
      ["p-upcoming", "upcoming"],
      ["p-waiting", "waiting"],
    ]);
  });
});

describe("Home: invites from other Kindred parents (T15)", () => {
  it("shows 'Alex invited Noor' with the day, time, place, the host and this parent's own answer, linking to the invite", () => {
    const page = html(<HomeView firstName="Priya" childName="Noor" playdates={[]} invites={[invite]} now={NOW} zone={ZONE} />);
    expect(page).toContain("Alex invited Noor");
    expect(page).toContain("Sunday · 10:00 AM to 12:00 PM");
    expect(page).toContain(">Christie Pits<");
    expect(page).toContain(">29<");
    expect(page).toContain("Host: Alex<");
    expect(page).toContain("Waiting for your answer · tap to answer");
    expect(page).toContain(`href="/invites/${invite.inviteId}"`);
    const answered = html(<HomeView playdates={[]} childName="Noor" invites={[{ ...invite, myAnswer: "yes", confirmed: true }, { ...invite, inviteId: "x", mode: "availability", start: null, end: null }]} now={NOW} zone={ZONE} />);
    expect(answered).toContain("✓ Confirmed");
    expect(answered).toMatch(/You<span class="sr-only"> coming<\/span>/);
    expect(answered).toContain("Pick a time that works");
  });
});

describe("Home: Recent playdates (T38)", () => {
  const recent = [{ id: "r1", title: "Playdate: Mia & Arjun", timezone: ZONE, start: new Date("2026-11-07T19:00:00Z"), end: new Date("2026-11-07T21:00:00Z"), placeName: "High Park" }];
  it("lists past confirmed playdates with Plan again, and is hidden when there are none", () => {
    const markup = view({ recent });
    expect(headings(markup)).toEqual(["Recent playdates"]);
    expect(markup).toContain(">Mia &amp; Arjun<");
    expect(markup).toContain(">High Park<");
    expect(markup).toContain("2:00 PM to 4:00 PM");
    expect(markup).toContain('href="/plan?again=r1"');
    expect(markup).toContain(">Plan again<");
    expect(view()).not.toContain("Recent playdates");
  });
});
