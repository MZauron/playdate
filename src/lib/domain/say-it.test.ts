import { describe, expect, it, vi } from "vitest";
import { clean, readSentence, saidToPrefill, sayIt, type Said, type SayFriend } from "./say-it";
import type { SayItIdeas } from "@/lib/integrations/ai/types";

// Wednesday, Nov 18, 2026.
const TODAY = "2026-11-18";
const DEV = "11111111-1111-4111-8111-111111111111";
const MAYA = "22222222-2222-4222-8222-222222222222";
const PRIYA = "33333333-3333-4333-8333-333333333333";
const friends: SayFriend[] = [
  { id: DEV, parentName: "Dev Patel", childFirstName: "Arjun" },
  { id: MAYA, parentName: "Maya Chen", childFirstName: "Leo" },
  { id: PRIYA, parentName: "Priya", childFirstName: "Zoë" },
];
const read = (words: string) => readSentence(words, { today: TODAY, friends });
const said = (over: Partial<Said>): Said => ({
  friendIds: [],
  days: [],
  start: null,
  end: null,
  slot: null,
  place: null,
  ...over,
});

describe("the built-in reader (T43)", () => {
  it.each<[string, Partial<Said>]>([
    [
      "Dev, Saturday 2 to 4 at the park",
      {
        friendIds: [DEV],
        days: ["2026-11-21"],
        start: "14:00",
        end: "16:00",
        place: "the park",
      },
    ],
    [
      "Maya and Dev tomorrow 10 to 12",
      {
        friendIds: [DEV, MAYA],
        days: ["2026-11-19"],
        start: "10:00",
        end: "12:00",
      },
    ],
    ["Arjun's family, Sunday at Riverdale Farm", { friendIds: [DEV], days: ["2026-11-22"], place: "Riverdale Farm" }],
    ["Leo today 3:30-5:30", { friendIds: [MAYA], days: ["2026-11-18"], start: "15:30", end: "17:30" }],
    [
      "sat or sun afternoon with zoë",
      {
        friendIds: [PRIYA],
        days: ["2026-11-21", "2026-11-22"],
        slot: "afternoon",
      },
    ],
    ["this weekend at the library", { days: ["2026-11-21", "2026-11-22"], place: "the library" }],
    ["Dev 11 to 1 on Friday", { friendIds: [DEV], days: ["2026-11-20"], start: "11:00", end: "13:00" }],
    [
      "Maya at 2 at the splash pad",
      {
        friendIds: [MAYA],
        start: "14:00",
        end: "16:00",
        place: "the splash pad",
      },
    ],
    ["Dev Nov 25 10am-12", { friendIds: [DEV], days: ["2026-11-25"], start: "10:00", end: "12:00" }],
    [
      "Wednesday morning at the indoor playground, Dev",
      {
        friendIds: [DEV],
        days: ["2026-11-25"],
        slot: "morning",
        place: "the indoor playground",
      },
    ],
    ["Priya tonight", { friendIds: [PRIYA], days: ["2026-11-18"], slot: "evening" }],
    ["Dev noon to 2", { friendIds: [DEV], start: "12:00", end: "14:00" }],
    ["Dev 1 to 3pm", { friendIds: [DEV], start: "13:00", end: "15:00" }],
  ])("%s", (words, expected) => {
    expect(read(words)).toEqual(said(expected));
  });

  it("finds nothing in a sentence without names, days, times or a place", () => {
    expect(read("let's do something soon")).toEqual(said({}));
  });

  it("only names the parent's own friends, and never a name inside another word", () => {
    expect(read("Devon and Mayan, Saturday")).toEqual(said({ days: ["2026-11-21"] }));
  });

  it("leaves out days past the two weeks the pickers show, and times off the pickers", () => {
    expect(read("Dec 25 at 2")).toEqual(said({ start: "14:00", end: "16:00" }));
    expect(read("Dev 2:10 to 4")).toEqual(said({ friendIds: [DEV] }));
    expect(read("Dev 10pm to 11pm")).toEqual(said({ friendIds: [DEV] }));
  });

  it("reads a weekday as the next one after today", () => {
    expect(read("Wednesday").days).toEqual(["2026-11-25"]);
    expect(readSentence("Saturday", { today: "2026-11-21", friends }).days).toEqual(["2026-11-28"]);
    expect(readSentence("this weekend", { today: "2026-11-21", friends }).days).toEqual(["2026-11-21", "2026-11-22"]);
  });
});

describe("clean: whatever read the sentence", () => {
  it("drops other parents' friends, days out of range, and times that are not a range on the pickers", () => {
    const context = { today: TODAY, friends };
    expect(
      clean(
        said({
          friendIds: [DEV, "someone-else"],
          days: ["2026-11-10", "2026-11-21", "2027-01-01"],
          start: "16:00",
          end: "14:00",
        }),
        context,
      ),
    ).toEqual(said({ friendIds: [DEV], days: ["2026-11-21"] }));
    expect(clean(said({ start: "9:00", end: "11:00" }), context)).toEqual(said({}));
  });
});

describe("saidToPrefill", () => {
  const saved = [{ name: "Riverdale Park", address: "550 Broadview Ave" }];

  it("one day: a set time, from the times or from the part of the day", () => {
    expect(
      saidToPrefill(
        said({
          friendIds: [DEV],
          days: ["2026-11-21"],
          start: "14:00",
          end: "16:00",
        }),
        saved,
      ),
    ).toEqual({
      friendIds: [DEV],
      day: "2026-11-21",
      start: "14:00",
      end: "16:00",
    });
    expect(saidToPrefill(said({ days: ["2026-11-21"], slot: "morning" }), saved)).toEqual({
      friendIds: [],
      day: "2026-11-21",
      start: "09:00",
      end: "12:00",
    });
    expect(saidToPrefill(said({ days: ["2026-11-21"] }), saved)).toEqual({
      friendIds: [],
      day: "2026-11-21",
    });
  });

  it("several days: Share availability in the parts of the day said, or all of them", () => {
    expect(saidToPrefill(said({ days: ["2026-11-21", "2026-11-22"], slot: "afternoon" }), saved).slots).toEqual([
      "2026-11-21|afternoon",
      "2026-11-22|afternoon",
    ]);
    expect(
      saidToPrefill(
        said({
          days: ["2026-11-21", "2026-11-22"],
          start: "11:00",
          end: "14:00",
        }),
        saved,
      ).slots,
    ).toEqual(["2026-11-21|morning", "2026-11-21|afternoon", "2026-11-22|morning", "2026-11-22|afternoon"]);
    expect(saidToPrefill(said({ days: ["2026-11-21", "2026-11-22"] }), saved).slots).toHaveLength(6);
  });

  it("a saved place brings its address; any other place is typed as said", () => {
    expect(saidToPrefill(said({ place: "riverdale park" }), saved)).toMatchObject({
      placeName: "Riverdale Park",
      placeAddress: "550 Broadview Ave",
    });
    expect(saidToPrefill(said({ place: "the park" }), saved)).toMatchObject({
      placeName: "the park",
      placeAddress: "",
    });
  });
});

describe("sayIt", () => {
  const parent = { id: "p1", friends, savedPlaces: [] };
  const open = { hit: () => ({ ok: true as const }) };

  it("without the AI (AI_MODE=fake) fills in from the built-in reader", async () => {
    const ai: SayItIdeas = { sayIt: () => Promise.reject(new Error("fake")) };
    const log = vi.fn();
    const result = await sayIt({ ai, limiter: open, log }, parent, "Dev, Saturday 2 to 4 at the park", TODAY);
    expect(result).toEqual({
      ok: true,
      source: "built_in",
      prefill: {
        friendIds: [DEV],
        day: "2026-11-21",
        start: "14:00",
        end: "16:00",
        placeName: "the park",
        placeAddress: "",
      },
    });
    expect(log).toHaveBeenCalledWith("say_ai_fallback");
  });

  it("sends the AI only the sentence, today and the friends' first names under refs, and checks what comes back", async () => {
    const ai = {
      sayIt: vi.fn<SayItIdeas["sayIt"]>().mockResolvedValue({
        friends: ["f2", "f9"],
        days: ["2026-11-21", "2030-01-01"],
        start: "14:00",
        end: "16:00",
        slot: null,
        place: "the park",
      }),
    };
    const result = await sayIt({ ai, limiter: open }, parent, "  Maya   and Arjun, Saturday 2 to 4 at the park ", TODAY);
    expect(ai.sayIt).toHaveBeenCalledWith({
      words: "Maya and Arjun, Saturday 2 to 4 at the park",
      today: TODAY,
      weekday: "Wednesday",
      friends: [
        { ref: "f1", name: "Dev" },
        { ref: "f2", name: "Maya" },
        { ref: "f3", name: "Priya" },
      ],
    });
    expect(JSON.stringify(ai.sayIt.mock.calls)).not.toMatch(/Patel|Chen|Leo|Zoë|1111/);
    // Arjun is a child's name, matched here only; the AI's unknown ref and out-of-range day are dropped.
    expect(result).toMatchObject({
      ok: true,
      source: "ai",
      prefill: {
        friendIds: [MAYA, DEV],
        day: "2026-11-21",
        start: "14:00",
        end: "16:00",
      },
    });
  });

  it("uses the built-in reader once the AI's limit is reached, without calling it", async () => {
    const ai = { sayIt: vi.fn<SayItIdeas["sayIt"]>() };
    const result = await sayIt(
      {
        ai,
        limiter: { hit: () => ({ ok: false as const, retryAfterSeconds: 60 }) },
      },
      parent,
      "Dev tomorrow",
      TODAY,
    );
    expect(ai.sayIt).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      source: "built_in",
      prefill: { friendIds: [DEV], day: "2026-11-19" },
    });
  });

  it("says NOTHING_SAID when nothing in the sentence can fill in Plan", async () => {
    const ai: SayItIdeas = {
      sayIt: () =>
        Promise.resolve({
          friends: [],
          days: [],
          start: null,
          end: null,
          slot: null,
          place: null,
        }),
    };
    expect(await sayIt({ ai, limiter: open }, parent, "let's do something soon", TODAY)).toEqual({ ok: false, code: "NOTHING_SAID" });
    expect(await sayIt({ ai, limiter: open }, parent, "   ", TODAY)).toEqual({
      ok: false,
      code: "NOTHING_SAID",
    });
  });
});
