// The sent screen and the leave dialog, rendered to HTML (no browser): what a parent sees and can tap.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LeaveDialog } from "./LeaveDialog";
import { SentView } from "./SentView";

const texts = [
  { friendId: "a", name: "Dev", label: "Arjun's dad", channel: "text" as const, href: "sms:+14165550111?&body=Park%3F%0A%0Ahttps%3A%2F%2Fkindred.test%2Fr%2Fabc" },
  { friendId: "b", name: "Maya", label: "Lily's parent", channel: "app" as const, href: "sms:+14165550177?&body=x" },
];

describe("SentView (Q3)", () => {
  it("shows one Text button per family, linking to Messages; only the next one is coral", () => {
    const html = renderToStaticMarkup(<SentView texts={texts} />);
    expect(html).toContain("Your invite is ready");
    expect(html).toContain(`href="${texts[0]!.href.replace("&", "&amp;")}"`);
    expect(html).toContain("Text Dev");
    expect(html).toContain("Text Maya");
    expect(html.match(/bg-accent/g)).toHaveLength(1);
    expect(html.indexOf("bg-accent")).toBeLessThan(html.indexOf("Text Dev"));
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
