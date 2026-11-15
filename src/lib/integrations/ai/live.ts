// AI_MODE=live: message ideas (T08) and Ask Kindred's picks (T18) from Claude. Server only: the key never reaches a browser.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { MessageIdeas, PlaceIdeas } from "./types";

const MODEL = "claude-opus-5-5";

const Ideas = z.object({ messages: z.array(z.string()) });

const SYSTEM = `You write short invitation messages that a parent texts to other parents they already know, to plan a playdate for their kids.
Write exactly three different messages in Canadian English. Each is one or two sentences, under 200 characters, warm, plain and friendly,
like a parent writing to a friend. Mention the day, time and place when they are given. Never invent a day, time, place, name or detail
that is not given. Do not use names: say "the kids". At most one exclamation mark per message. No emoji, no hashtags, no sign-off.`;

export function liveMessageIdeas(apiKey: string): MessageIdeas {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 });
  return {
    async messageIdeas(request) {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: "low", format: zodOutputFormat(Ideas) },
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(request) }],
      });
      if (response.stop_reason !== "end_turn") throw new Error(`ai stopped: ${response.stop_reason}`);
      const ideas = (response.parsed_output?.messages ?? []).map((m) => m.trim()).filter((m) => m.length > 0 && m.length <= 1000);
      if (ideas.length < 3) throw new Error("ai returned fewer than three ideas");
      return ideas.slice(0, 3);
    },
  };
}

const Picks = z.object({ places: z.array(z.object({ id: z.string(), reason: z.string() })) });

const PLACES_SYSTEM = `A parent in Canada is looking for a place for a playdate with their kids, and describes it in their own words.
You get their words, the kids' ages, and candidate places a maps service found (id, name, indoor/outdoor, ages, price, rating).
Choose up to four candidates that fit best, best first. For each, write one reason in Canadian English, under 100 characters, plain
and warm, that says why it fits what the parent asked. Use only the facts given; never invent hours, prices, features or places.
Return each chosen place's id exactly as given. If nothing fits, return an empty list.`;

export function livePlaceIdeas(apiKey: string): PlaceIdeas {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 });
  return {
    async placeIdeas(request) {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: "low", format: zodOutputFormat(Picks) },
        system: PLACES_SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(request) }],
      });
      if (response.stop_reason !== "end_turn") throw new Error(`ai stopped: ${response.stop_reason}`);
      return response.parsed_output?.places ?? [];
    },
  };
}
