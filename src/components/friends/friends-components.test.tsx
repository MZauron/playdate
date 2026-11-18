import { renderToStaticMarkup as html } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/friends/actions", () => ({ addFriendAction: vi.fn(), renameFriendAction: vi.fn(), removeFriendAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

const { AddFriendForm } = await import("./AddFriendForm");
const { FriendRow } = await import("./FriendRow");

const friend = { id: "f1", parentName: "Dev Patel", childFirstName: "Arjun", label: "Arjun's dad", hasKindred: true };

describe("FriendRow", () => {
  it("shows the label, the parent's name and 'has Kindred' for a friend on Kindred", () => {
    const markup = html(<FriendRow friend={friend} />);
    expect(markup).toContain("Arjun&#x27;s dad");
    expect(markup).toContain("Dev Patel");
    expect(markup).toMatch(/text-success[^>]*>has Kindred</);
    expect(markup).not.toContain("gets a text");
  });
  it("says 'gets a text' for a friend who is not", () => {
    const markup = html(<FriendRow friend={{ ...friend, hasKindred: false }} />);
    expect(markup).toMatch(/text-muted[^>]*>gets a text</);
    expect(markup).not.toContain("has Kindred");
  });
  it("offers Rename and Remove, each at least 44 px, Remove in red", () => {
    const markup = html(<FriendRow friend={friend} />);
    expect(markup).toContain(">Rename<");
    expect(markup).toContain(">Remove<");
    expect(markup.match(/h-11/g)).toHaveLength(2);
    expect(markup).toContain("border-danger");
  });
  it("holds no phone number or hash: it never gets one", () => {
    expect(Object.keys(friend)).not.toEqual(expect.arrayContaining(["phone"]));
    expect(html(<FriendRow friend={friend} />)).not.toMatch(/\+1\d{10}|phone/i);
  });
});

describe("AddFriendForm", () => {
  const markup = html(<AddFriendForm />);
  it("asks for the parent's name, the child's name and the number", () => {
    expect(markup).toContain("Add a friend");
    for (const label of ["Parent&#x27;s name", "Child&#x27;s first name", "Phone number"]) expect(markup).toContain(label);
    for (const name of ['name="name"', 'name="childName"', 'name="phone"']) expect(markup).toContain(name);
  });
  it("has a Paste a number button, and the one coral action is Add friend", () => {
    expect(markup).toContain(">Paste a number<");
    expect(markup.match(/bg-accent/g)).toHaveLength(1);
    expect(markup).toMatch(/bg-accent[^>]*type="submit"|type="submit"[^>]*bg-accent|bg-accent[^>]*>Add friend</);
  });
  it("shows no contact picker button until the browser says it has one (the server cannot know)", () => {
    expect(markup).not.toContain("Choose from contacts");
  });
  it("makes every box 48 px and every button at least 44 px", () => {
    expect(markup.match(/h-12/g)).toHaveLength(3);
    expect(markup).toContain("h-11"); // Paste a number
    expect(markup).toContain("h-[50px]"); // Add friend
  });
});

describe("A page for each friend (T40)", async () => {
  const { FriendListRow } = await import("./FriendListRow");
  const { FriendPage } = await import("./FriendPage");
  const ZONE = "America/Toronto";
  const open = [{ id: "p1", title: "Playdate: Mia & Arjun", timezone: ZONE, start: new Date("2026-11-21T15:00:00Z"), end: new Date("2026-11-21T17:00:00Z"), placeName: "High Park", confirmed: false }];
  const past = [{ ...open[0]!, id: "p0", confirmed: true, start: new Date("2026-11-07T19:00:00Z"), end: new Date("2026-11-07T21:00:00Z"), placeName: "Riverdale Park" }];

  it("lists each friend as a link to their page, with initials, label, name and has Kindred / gets a text", () => {
    const markup = html(<FriendListRow friend={friend} />);
    expect(markup).toContain(`href="/friends/${friend.id}"`);
    expect(markup).toContain(">DP<");
    expect(markup).toContain("Arjun&#x27;s dad");
    expect(markup).toContain("Dev Patel · has Kindred");
  });
  it("shows the friend, a coral Plan a playdate with Dev, open playdates, past ones with Plan again, and Rename / Remove", () => {
    const markup = html(<FriendPage friend={{ ...friend, hasKindred: false }} open={open} past={past} />);
    expect(markup).toContain("Dev Patel");
    expect(markup).toContain("gets a text");
    expect(markup).toContain("Invites go to their phone as a text from you.");
    expect(markup).toMatch(new RegExp(`href="/plan\\?friend=${friend.id}"[^>]*>Plan a playdate with Dev<|bg-accent[^"]*" href="/plan\\?friend=${friend.id}">Plan a playdate with Dev<`));
    expect(markup).toContain('href="/playdates/p1"');
    expect(markup).toContain("Waiting for answers · High Park");
    expect(markup).toContain('href="/plan?again=p0"');
    expect(markup).toContain("Rename");
    expect(markup).not.toMatch(/\+1\d{10}/);
  });
  it("says so when there are no playdates together yet", () => {
    expect(html(<FriendPage friend={friend} open={[]} past={[]} />)).toContain("No playdates yet.");
  });
});
