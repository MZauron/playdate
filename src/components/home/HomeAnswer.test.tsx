import { renderToStaticMarkup as html } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { parseAnswerForm } from "@/lib/domain/invite-page";

vi.mock("@/app/r/[token]/actions", () => ({ answerAction: vi.fn() }));
const { HomeAnswer } = await import("./HomeAnswer");

const INVITE = "11111111-2222-4333-8444-555555555555";
const view = (over: Partial<Parameters<typeof HomeAnswer>[0]> = {}) =>
  html(<HomeAnswer inviteId={INVITE} timeVersion={3} organizer="Alex" answer={null} reason={null} {...over} />);
const hidden = (markup: string) => Object.fromEntries([...markup.matchAll(/type="hidden" name="([^"]+)" value="([^"]*)"/g)].map((m) => [m[1], m[2]]));

describe("HomeAnswer (T49)", () => {
  it("offers Coming and Can't make it, posting the same fields as the invite page (invite id, time version, a yes)", () => {
    const markup = view();
    expect(markup).toContain(">Coming<");
    expect(markup).toContain(">Can&#x27;t make it<");
    expect(markup).toContain('aria-label="Your answer to Alex"');
    expect(markup).not.toContain("bg-accent"); // Plan another stays Home's one coral action
    const fields = hidden(markup);
    expect(fields).toEqual({ inviteId: INVITE, timeVersion: "3", kind: "yes" });
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.set(k, v!);
    expect(parseAnswerForm(form)).toMatchObject({ success: true, data: { kind: "yes", timeVersion: 3 } });
  });

  it("shows the saved answer with Change my answer", () => {
    expect(view({ answer: "yes" })).toContain("You&#x27;re coming");
    const no = view({ answer: "no", reason: "busy" });
    expect(no).toContain("Can&#x27;t make it · We&#x27;re busy then");
    expect(no).toContain(">Change my answer<");
    expect(no).not.toContain(">Coming<");
  });
});
