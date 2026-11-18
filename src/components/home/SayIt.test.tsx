import { renderToStaticMarkup as html } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { enCA } from "@/lib/i18n/en-CA";

vi.mock("@/app/(app)/plan/actions", () => ({ sayItAction: vi.fn() }));
const { SayIt } = await import("./SayIt");

describe("SayIt (T43)", () => {
  it("is a labelled box with the example and a teal Fill in Plan button: it opens Plan, it never sends", () => {
    const markup = html(<SayIt />);
    expect(markup).toContain(`>${enCA.home.sayIt.label}</label>`);
    expect(markup).toContain(`placeholder="${enCA.home.sayIt.placeholder}"`);
    expect(markup).toContain('maxLength="200"');
    expect(markup).toMatch(/type="submit"[^>]*bg-primary-tint[^>]*>Fill in Plan</);
    expect(markup).not.toContain("bg-accent");
  });
});
