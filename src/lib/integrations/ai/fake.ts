// AI_MODE=fake: tests and phone sessions. Deterministic, no network; the caller's built-in ideas do the real work.
import type { MessageIdeas, PlaceIdeas, SayItIdeas } from "./types";

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

/** Or just say it without the AI: the caller's built-in reader fills in the Plan screen. */
export const fakeSayIt: SayItIdeas = {
  async sayIt() {
    throw new Error("fake AI: use the built-in reader");
  },
};
