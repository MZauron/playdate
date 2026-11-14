import { renderToStaticMarkup as html } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { groupForHome } from "./home-data";
import { HomeView } from "./HomeView";
import { cancelled, needsYou, NOW, over, upcoming, upcomingLater, waiting, ZONE } from "./fixtures";

const view = (props: Partial<Parameters<typeof HomeView>[0]> = {}) => html(<HomeView playdates={[]} now={NOW} zone={ZONE} {...props} />);
const headings = (markup: string) => [...markup.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map((m) => m[1]);

describe("Home with no playdates", () => {
  it("is the banner and the Plan a playdate card, nothing else", () => {
    const markup = view();
    expect(markup).toContain("Saturday, November 14");
    expect(markup).toContain("<h1");
    expect(markup).toMatch(/href="\/plan"[^>]*>.*Plan a playdate/);
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

describe("Home with playdates", () => {
  const all = [waiting, needsYou, upcomingLater, upcoming, over, cancelled];

  it("shows the three sections in order, each only when it has something", () => {
    expect(headings(view({ playdates: all }))).toEqual(["Needs you", "Upcoming", "Waiting for answers"]);
    expect(headings(view({ playdates: [upcoming] }))).toEqual(["Upcoming"]);
    expect(headings(view({ playdates: [waiting] }))).toEqual(["Waiting for answers"]);
    expect(headings(view({ playdates: [needsYou, waiting] }))).toEqual(["Needs you", "Waiting for answers"]);
  });
  it("leaves over and cancelled playdates off Home", () => {
    const markup = view({ playdates: all });
    expect(markup).not.toContain("p-over");
    expect(markup).not.toContain("p-cancelled");
    expect(markup.match(/<li/g)).toHaveLength(4);
  });
  it("shows an upcoming playdate as a date tile, time, place and initials", () => {
    const markup = view({ playdates: [upcoming] });
    expect(markup).toContain(">Nov<");
    expect(markup).toContain(">16<");
    expect(markup).toContain("9:00 AM to 12:00 PM");
    expect(markup).toContain("Riverdale Park");
    expect(markup).toContain("Playdate: Mia &amp; Lily");
    expect(markup).toContain(">M<");
  });
  it("says a place is still to be decided when there is none", () => {
    expect(view({ playdates: [upcomingLater] })).toContain("Place to be decided");
  });
  it("shows how many families answered, with a bar", () => {
    const markup = view({ playdates: [waiting] });
    expect(markup).toContain("2 of 3 families answered");
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="2"');
    expect(markup).toContain("width:66.6");
  });
  it("says family, not families, for one", () => {
    expect(view({ playdates: [{ ...waiting, inviteCount: 1, answers: [], friendInitials: ["D"] }] })).toContain("0 of 1 family answered");
  });
  it("links each playdate to its page", () => {
    expect(view({ playdates: [needsYou] })).toContain('href="/playdates/p-needs"');
  });
});

describe("groupForHome (KD-13)", () => {
  it("sorts Upcoming by start, soonest first", () => {
    expect(groupForHome([upcomingLater, upcoming], NOW).upcoming.map((p) => p.id)).toEqual(["p-upcoming", "p-upcoming-later"]);
  });
  it("puts each playdate in one section", () => {
    const sections = groupForHome([waiting, needsYou, upcoming, over, cancelled], NOW);
    expect(sections.needs_you.map((p) => p.id)).toEqual(["p-needs"]);
    expect(sections.upcoming.map((p) => p.id)).toEqual(["p-upcoming"]);
    expect(sections.waiting.map((p) => p.id)).toEqual(["p-waiting"]);
  });
});
