import { renderToStaticMarkup as html } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FreeSheet } from "./FreeSheet";

vi.mock("@/app/(app)/free-actions", () => ({ setFreeAction: vi.fn(), clearFreeAction: vi.fn() }));

const kids = [
  { id: "c1", firstName: "Mia", status: { kind: "this_weekend" as const, words: null } },
  { id: "c2", firstName: "Ethan", status: null },
];

describe("FreeSheet (T45)", () => {
  it("shows the banner's line, and a row per child with its status or Not set", () => {
    const markup = html(<FreeSheet kids={kids} label="Mia is free this weekend" anyFree />);
    expect(markup).toContain("Mia is free this weekend");
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain("Not set");
    expect(markup).toContain('aria-label="Change Mia&#x27;s status"');
    expect(markup).toContain('aria-label="Share when Ethan is free"');
    expect(markup).toContain("Only friends who have added you back see it, for 2 days at most. Nothing is sent.");
  });
});
