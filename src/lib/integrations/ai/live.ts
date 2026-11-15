// AI_MODE=live: three message ideas from Claude. Server only: the key never reaches a browser.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { MessageIdeas } from "./types";

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
