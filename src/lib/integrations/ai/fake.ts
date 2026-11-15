// AI_MODE=fake: tests and phone sessions. Deterministic, no network; the caller's built-in ideas do the real work.
import type { MessageIdeas, PlaceIdeas } from "./types";

export const fakeMessageIdeas: MessageIdeas = {
  async messageIdeas() {
    throw new Error("fake AI: use the built-in ideas");
  },
};

/** Ask Kindred without the AI: the caller's keyword fallback picks the places and says why. */
export const fakePlaceIdeas: PlaceIdeas = {
  async placeIdeas() {
    throw new Error("fake AI: use the keyword fallback");
  },
};
