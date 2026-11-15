// Chooses the AI by env (AI_MODE). Live without a key behaves like fake: the built-in ideas.
import "server-only";
import { env } from "@/env";
import { fakeMessageIdeas, fakePlaceIdeas } from "./fake";
import { liveMessageIdeas, livePlaceIdeas } from "./live";
import type { MessageIdeas, PlaceIdeas } from "./types";

export type { MessageIdeas, MessageIdeasRequest, PlaceIdeas, PlaceIdeasRequest } from "./types";

let live: MessageIdeas | undefined;

export function messageIdeas(): MessageIdeas {
  if (env.AI_MODE !== "live" || !env.ANTHROPIC_API_KEY) return fakeMessageIdeas;
  return (live ??= liveMessageIdeas(env.ANTHROPIC_API_KEY));
}

let livePlaces: PlaceIdeas | undefined;

export function placeIdeas(): PlaceIdeas {
  if (env.AI_MODE !== "live" || !env.ANTHROPIC_API_KEY) return fakePlaceIdeas;
  return (livePlaces ??= livePlaceIdeas(env.ANTHROPIC_API_KEY));
}
