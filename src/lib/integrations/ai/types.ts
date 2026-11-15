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
