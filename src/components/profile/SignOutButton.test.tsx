import { renderToStaticMarkup as html } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/actions", () => ({ signOutAction: vi.fn() }));
const { SignOutButton } = await import("./SignOutButton");

describe("SignOutButton (T54)", () => {
  it("is a button that asks first, not a form that signs out at once", () => {
    const markup = html(<SignOutButton />);
    expect(markup).toContain(">Sign out<");
    expect(markup).toContain('type="button"');
    expect(markup).not.toContain("<form");
  });
});
