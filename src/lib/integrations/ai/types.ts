// The AI port (CLAUDE.md "Integrations"): message ideas for the Plan screen's ✨ Suggestions. Every caller has a non-AI fallback.

/**
 * What the AI may know about a plan. No names: children's first names and the parents' names stay in Kindred (DESIGN.md
 * "Privacy"), so the ideas speak of "the kids". The day, time and place are the organizer's own words on their own plan.
 */
export type MessageIdeasRequest = {
  /** "Mon, Nov 16" or null when no time is chosen yet. */
  day: string | null;
  /** "10:00 AM to 12:00 PM" or null. */
  time: string | null;
  placeName: string | null;
  families: number;
  /** Ideas already shown, so ↻ New ideas brings different ones. */
  avoid: readonly string[];
};

export type MessageIdeas = {
  /** Exactly three short messages, or an error the caller answers with the built-in ideas. */
  messageIdeas(request: MessageIdeasRequest): Promise<string[]>;
};

/**
 * Ask Kindred (T18): the parent's own words, their children's ages (DESIGN.md "Privacy": ages are used only to suggest places) and
 * candidate places the provider found. No names. The AI only chooses among the candidates; it never adds a place.
 */
export type PlaceIdeasRequest = {
  words: string;
  /** "Baby", "3", "5": the age labels from Setup. */
  childAges: readonly string[];
  candidates: readonly { id: string; name: string; setting: string | null; ages: string | null; price: string | null; rating: number | null }[];
};

export type PlaceIdeas = {
  /** Up to four candidate ids, best first, each with a one-line reason; or an error the caller answers with the keyword fallback. */
  placeIdeas(request: PlaceIdeasRequest): Promise<{ id: string; reason: string }[]>;
};

/**
 * Or just say it (T43): the parent's sentence, today on their clock, and their friends' first names under short refs ("f1"). Nothing
 * else: no ids, no numbers, no children's names. The caller checks every value and falls back to its built-in reader.
 */
export type SayItRequest = {
  words: string;
  /** "2026-11-18" */
  today: string;
  /** "Wednesday" */
  weekday: string;
  friends: readonly { ref: string; name: string }[];
};

export type SayItAnswer = {
  /** Refs from the request. */
  friends: string[];
  /** "2026-11-21", within the next two weeks. */
  days: string[];
  /** "14:00" or null. */
  start: string | null;
  end: string | null;
  slot: "morning" | "afternoon" | "evening" | null;
  /** The place as the parent said it, or null. */
  place: string | null;
};

export type SayItIdeas = {
  sayIt(request: SayItRequest): Promise<SayItAnswer>;
};
