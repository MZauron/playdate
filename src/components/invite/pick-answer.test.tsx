// Answering availability (T13) rendered to HTML, and the pick helpers.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { InviteView } from "@/lib/domain/invite-page";
import { at } from "@/lib/rules/time";
import { InvitePage } from "./InvitePage";
import { pickOptions, rangeFields } from "./PickAnswer";

const ZONE = "America/Toronto";
const MON = "2026-11-16";
const a = { start: at(MON, 9, 30, ZONE), end: at(MON, 11, 0, ZONE) };
const view = (patch: Partial<InviteView> = {}): InviteView => ({
  state: "open",
  organizerFirstName: "Alex",
  organizerChild: "Mia",
  title: "Playdate: Mia & Arjun",
  label: "none",
  message: "Which works?",
  mode: "availability",
  zone: ZONE,
  start: null,
  end: null,
  confirmed: false,
  placeName: null,
  placeAddress: null,
  placeFacts: null,
  timeVersion: 1,
  answer: null,
  slots: [{ day: MON, slot: "morning" }, { day: MON, slot: "afternoon" }],
  picks: [{ range: a, others: ["Dev"], families: 1, mostPicked: true, yours: false }],
  ...patch,
});
const render = (v: InviteView) => renderToStaticMarkup(<InvitePage view={v} inviteKey={{ token: "AAAAAAAAAAAAAAAAAAAAAA" }} />);

describe("the availability invite page", () => {
  it("before answering: Already suggested with Pick this, the organizer's free boxes, and Can't make it; no We're in!", () => {
    const html = render(view());
    expect(html).toContain("Already suggested");
    expect(html).toContain("Mon, Nov 16, 9:30 AM to 11:00 AM");
    expect(html).toContain("Dev · 1 family");
    expect(html).toContain("Pick this");
    expect(html).toContain("Alex&#x27;s availability");
    expect(html).toContain("Morning · Free");
    expect(html).toContain("Afternoon · Free");
    expect(html).toContain("Can&#x27;t make it");
    expect(html).not.toContain("We&#x27;re in!");
  });

  it("after picking: Your pick, Everyone's picks with Most picked, and Switch to this on the others", () => {
    const b = { start: at(MON, 13, 0, ZONE), end: at(MON, 14, 0, ZONE) };
    const html = render(
      view({
        answer: { kind: "pick", reason: null, note: null, pick: b },
        picks: [
          { range: a, others: ["Dev", "Maya"], families: 2, mostPicked: true, yours: false },
          { range: b, others: [], families: 1, mostPicked: false, yours: true },
        ],
      }),
    );
    expect(html).toContain("Your pick: Mon, Nov 16, 1:00 PM to 2:00 PM");
    expect(html).toContain("Everyone&#x27;s picks");
    expect(html).toContain("Dev, Maya · 2 families");
    expect(html).toContain("You · 1 family");
    expect(html).toContain("Most picked");
    expect(html.match(/Switch to this/g)).toHaveLength(1);
  });
});

describe("pick helpers", () => {
  it("offer half-hour steps inside the slot, at least 30 minutes", () => {
    expect(pickOptions({ day: MON, slot: "morning" }, null)).toEqual({
      froms: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
      untils: ["09:30", "10:00", "10:30", "11:00", "11:30", "12:00"],
    });
    expect(pickOptions({ day: MON, slot: "evening" }, "18:00").untils).toEqual(["18:30", "19:00"]);
  });
  it("turn a range back into the form's day and clock times on the playdate's clock", () => {
    expect(rangeFields(a, ZONE)).toEqual({ pickDay: MON, pickFrom: "09:30", pickUntil: "11:00" });
    expect(rangeFields({ start: at(MON, 23, 30, "Asia/Kolkata"), end: at("2026-11-17", 0, 0, "Asia/Kolkata") }, "Asia/Kolkata")).toEqual({ pickDay: MON, pickFrom: "23:30", pickUntil: "00:00" });
  });
});
