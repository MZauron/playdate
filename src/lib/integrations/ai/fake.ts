// AI_MODE=fake: tests and phone sessions. Deterministic, no network; the caller's built-in ideas do the real work.
import type { MessageIdeas } from "./types";

export const fakeMessageIdeas: MessageIdeas = {
  async messageIdeas() {
    throw new Error("fake AI: use the built-in ideas");
  },
};
