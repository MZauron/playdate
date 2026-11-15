// ✨ Suggestions: the AI's ideas when it answers, the built-in ones otherwise; no names ever go to the AI.
import { describe, expect, it, vi } from "vitest";
import type { MessageIdeas, MessageIdeasRequest } from "@/lib/integrations/ai/types";
import { builtInIdeas, suggestMessages, SuggestionsRequest, type SuggestDeps } from "./suggestions";

const ALEX = "11111111-1111-4111-8111-111111111111";
const DEV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const parent = { id: ALEX, childFirstName: "Mia" };
const ok = { hit: () => ({ ok: true as const }) };
const failingAi: MessageIdeas = { messageIdeas: async () => Promise.reject(new Error("down")) };
const request = (patch: object = {}) =>
  SuggestionsRequest.parse({ friendIds: [DEV], day: "2026-11-16", startTime: "10:00", endTime: "12:00", zone: "America/Toronto", placeName: "Riverdale Park", ...patch });
const deps = (patch: Partial<SuggestDeps> = {}): SuggestDeps => ({ ai: failingAi, limiter: ok, friendsChildren: async () => ["Arjun", "Lily"], ...patch });

describe("suggestMessages", () => {
  it("falls back to three built-in ideas from the plan when the AI fails, and logs only a code", async () => {
    const log = vi.fn();
    const result = await suggestMessages(deps({ log }), parent, request());
    expect(result).toEqual({
      ok: true,
      source: "built_in",
      ideas: [
        "Hi! Mia would love a playdate with Arjun and Lily. Are you free Mon, Nov 16, 10:00 AM to 12:00 PM at Riverdale Park?",
        "Mia keeps asking to see Arjun and Lily. Would Mon, Nov 16, 10:00 AM to 12:00 PM at Riverdale Park work for you?",
        "Want to get the kids together? We're thinking Mon, Nov 16, 10:00 AM to 12:00 PM at Riverdale Park. Let me know if that works.",
      ],
    });
    expect(log).toHaveBeenCalledWith("ai_failed");
  });

  it("↻ New ideas: the next round brings three different ones", async () => {
    const first = await suggestMessages(deps(), parent, request());
    const second = await suggestMessages(deps(), parent, request({ round: 1 }));
    if (!first.ok || !second.ok) throw new Error("expected ok");
    expect(second.ideas).toHaveLength(3);
    expect(second.ideas.some((idea) => first.ideas.includes(idea))).toBe(false);
    expect(second.ideas[0]).toBe("How about a playdate for Mia, Arjun and Lily? We could do Mon, Nov 16, 10:00 AM to 12:00 PM at Riverdale Park. No pressure if you're busy.");
  });

  it("works before any friend, time or place is chosen", async () => {
    const result = await suggestMessages(deps(), parent, SuggestionsRequest.parse({}));
    if (!result.ok) throw new Error("expected ok");
    expect(result.ideas[0]).toBe("Hi! Mia would love a playdate with your kids. Are you free sometime soon?");
  });

  it("uses the AI's ideas when it answers, and sends it the day, time and place but no names", async () => {
    const seen: MessageIdeasRequest[] = [];
    const ai: MessageIdeas = { messageIdeas: async (r) => (seen.push(r), ["a", "b", "c"]) };
    const friendsChildren = vi.fn(async () => ["Arjun"]);
    expect(await suggestMessages(deps({ ai, friendsChildren }), parent, request({ avoid: ["old"] }))).toEqual({ ok: true, source: "ai", ideas: ["a", "b", "c"] });
    expect(seen).toEqual([{ day: "Mon, Nov 16", time: "10:00 AM to 12:00 PM", placeName: "Riverdale Park", families: 1, avoid: ["old"] }]);
    expect(JSON.stringify(seen)).not.toMatch(/Mia|Arjun/);
    expect(friendsChildren).not.toHaveBeenCalled();
  });

  it("is rate limited per parent", async () => {
    const result = await suggestMessages(deps({ limiter: { hit: () => ({ ok: false, retryAfterSeconds: 30 }) } }), parent, request());
    expect(result).toEqual({ ok: false, code: "TOO_MANY_REQUESTS", retryAfterSeconds: 30 });
  });

  it("refuses a request that is not a plan", () => {
    expect(SuggestionsRequest.safeParse({ friendIds: ["x"] }).success).toBe(false);
    expect(SuggestionsRequest.safeParse({ round: -1 }).success).toBe(false);
  });
});

describe("builtInIdeas", () => {
  it("never puts more than one exclamation mark in an idea", () => {
    const words = { child: "Mia", kids: "Arjun", all: "Mia and Arjun", when: "sometime soon", at: "" };
    for (const round of [0, 1]) for (const idea of builtInIdeas(words, round)) expect(idea.split("!").length - 1).toBeLessThanOrEqual(1);
  });
});
