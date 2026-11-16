// The sent screen, the leave dialog and the availability picker, rendered to HTML (no browser): what a parent sees and can tap.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AvailabilityGrid } from "./AvailabilityGrid";
import { LeaveDialog } from "./LeaveDialog";
import { SentView } from "./SentView";

const texts = [
  { friendId: "a", name: "Dev", label: "Arjun's dad", channel: "text" as const, body: "Park?\n\nhttps://kindred.test/r/abc" },
  { friendId: "b", name: "Maya", label: "Lily's parent", channel: "app" as const, body: "x" },
];

describe("SentView (Q3)", () => {
  it("shows one Share button per family, with no number and no sms: link; only the next one is coral (Q26)", () => {
    const html = renderToStaticMarkup(<SentView texts={texts} playdateId="p1" />);
    expect(html).toContain("Your invite is ready");
    expect(html).not.toMatch(/sms:|\+1\d{10}/);
    expect(html).toContain("Share with Dev");
    expect(html).toContain("Share with Maya");
    expect(html.match(/bg-accent/g)).toHaveLength(1);
    expect(html.indexOf("bg-accent")).toBeLessThan(html.indexOf("Share with Dev"));
    expect(html).toContain("has Kindred");
    expect(html).toContain("gets a text");
  });
});

describe("LeaveDialog", () => {
  it("asks before discarding a plan, with Keep planning first", () => {
    const html = renderToStaticMarkup(<LeaveDialog onKeep={() => {}} onDiscard={() => {}} />);
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain("Leave this playdate?");
    expect(html.indexOf("Keep planning")).toBeLessThan(html.indexOf("Discard"));
  });
});

describe("the faster availability picker (T31)", () => {
  const picker = (value: string[]) => renderToStaticMarkup(<AvailabilityGrid today="2026-11-14" value={value} onChange={() => {}} />);
  it("shows two weeks of days, three labelled one-tap toggles each, and the quick picks", () => {
    const markup = picker([]);
    expect(markup.match(/aria-label="[^"]+, (Morning|Afternoon|Evening)"/g)).toHaveLength(42);
    expect(markup).toContain('aria-label="Sat, Nov 14, Morning"');
    expect(markup).toContain("Today");
    expect(markup).toContain("This week");
    expect(markup).toContain("Next week");
    for (const label of ["Weekend mornings", "Weekend afternoons", "Weekday afternoons"]) expect(markup).toContain(`>${label}<`);
  });
  it("marks a quick pick as on only when all its times are ticked", () => {
    const all = ["2026-11-14", "2026-11-15", "2026-11-21", "2026-11-22"].map((d) => `${d}|morning`);
    expect(picker(all)).toMatch(/aria-pressed="true"[^>]*>Weekend mornings</);
    expect(picker(all.slice(1))).toMatch(/aria-pressed="false"[^>]*>Weekend mornings</);
    expect(picker(all)).toMatch(/aria-pressed="true" aria-label="Sat, Nov 14, Morning"/);
  });
});
