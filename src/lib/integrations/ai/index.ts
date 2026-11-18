// Chooses the AI by env (AI_MODE). Live without a key behaves like fake: the built-in ideas.
import "server-only";
import { env } from "@/env";
import { fakeMessageIdeas, fakePlaceIdeas, fakeSayIt } from "./fake";
import { liveMessageIdeas, livePlaceIdeas, liveSayIt } from "./live";
import type { MessageIdeas, PlaceIdeas, SayItIdeas } from "./types";

export type { MessageIdeas, MessageIdeasRequest, PlaceIdeas, PlaceIdeasRequest, SayItIdeas, SayItRequest } from "./types";

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

let liveSay: SayItIdeas | undefined;

export function sayItIdeas(): SayItIdeas {
  if (env.AI_MODE !== "live" || !env.ANTHROPIC_API_KEY) return fakeSayIt;
  return (liveSay ??= liveSayIt(env.ANTHROPIC_API_KEY));
}
