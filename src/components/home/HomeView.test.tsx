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
});

describe("Home as one list (KD-13, Q24)", () => {
  const all = [waiting, needsYou, upcomingLater, upcoming, over, cancelled];

  it("is one list under Your playdates, soonest first, invites included", () => {
    const markup = view({ playdates: all, invites: [invite] });
    expect(headings(markup)).toEqual(["Your playdates"]);
    expect(order(markup)).toEqual(["p-needs", "p-upcoming", "p-waiting", "p-upcoming-later", invite.inviteId]);
    expect(markup).not.toContain(EMPTY_NOTE);
  });
  it("leaves over and cancelled playdates off Home", () => {
    const markup = view({ playdates: all });
    expect(markup).not.toContain("p-over");
    expect(markup).not.toContain("p-cancelled");
    expect(markup.match(/<li/g)).toHaveLength(4);
  });
  it("gives each card a date tile, time · place, one status line and initials", () => {
    const markup = view({ playdates: [upcoming] });
    expect(markup).toContain(">Nov<");
    expect(markup).toContain(">16<");
    expect(markup).toContain("9:00 AM to 12:00 PM · Riverdale Park");
    expect(markup).toContain("Playdate: Mia &amp; Lily");
    expect(markup).toContain(">Confirmed<");
    expect(markup).toContain(">M<");
  });
  it("says a place is still to be decided when there is none", () => {
    expect(view({ playdates: [upcomingLater] })).toContain("Place to be decided");
  });
  it("says why a playdate needs you, after a coral dot", () => {
    const markup = view({ playdates: [needsYou] });
    expect(markup).toContain("Everyone answered");
    expect(markup).toContain("bg-accent");
    const picked = view({ playdates: [{ ...waiting, mode: "availability", start: null, answers: [{ kind: "pick", answeredAt: NOW }, { kind: "pick", answeredAt: NOW }] }] });
    expect(picked).toContain("2 families picked a time");
    expect(picked).toContain("Time to be decided");
    expect(picked).toContain(">?<");
  });
  it("shows how many families answered while waiting, with no bar", () => {
    const markup = view({ playdates: [waiting] });
    expect(markup).toContain("2 of 3 families answered");
    expect(markup).not.toContain('role="progressbar"');
  });
  it("says family, not families, for one", () => {
    expect(view({ playdates: [{ ...waiting, inviteCount: 1, answers: [], friendInitials: ["D"] }] })).toContain("0 of 1 family answered");
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
  it("shows 'Alex invited Noor' with the time, place and this parent's own answer, linking to the invite", () => {
    const page = html(<HomeView firstName="Priya" childName="Noor" playdates={[]} invites={[invite]} now={NOW} zone={ZONE} />);
    expect(page).toContain("Alex invited Noor");
    expect(page).toContain("10:00 AM to 12:00 PM · Christie Pits");
    expect(page).toContain(">29<");
    expect(page).toContain("Waiting for your answer");
    expect(page).toContain(`href="/invites/${invite.inviteId}"`);
    const answered = html(<HomeView playdates={[]} childName="Noor" invites={[{ ...invite, myAnswer: "yes", confirmed: true }, { ...invite, inviteId: "x", mode: "availability", start: null, end: null }]} now={NOW} zone={ZONE} />);
    expect(answered).toContain("You&#x27;re in · Confirmed");
    expect(answered).toContain("Pick a time that works");
  });
});
