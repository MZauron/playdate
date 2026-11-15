// ✨ Suggestions and ↻ New ideas (T08). Ideas only fill the message box for the parent to edit; nothing is ever added to what they
// send (KD-05). Built-in ideas from the plan are the non-AI fallback, and what AI_MODE=fake shows.
import { z } from "zod";
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import type { MessageIdeas } from "@/lib/integrations/ai/types";
import { enCA, formatShortDay, formatTimeRange, joinNames, type SuggestionWords } from "@/lib/i18n/en-CA";
import { wallTime, zoneOrDefault } from "./playdates";

export const IDEAS_PER_ROUND = 3;

export const SuggestionsRequest = z.object({
  friendIds: z.array(z.uuid()).max(50).default([]),
  day: z.string().max(10).default(""),
  startTime: z.string().max(5).default(""),
  endTime: z.string().max(5).default(""),
  zone: z.string().max(64).default(""),
  placeName: z.string().max(80).default(""),
  round: z.number().int().min(0).max(1000).default(0),
  avoid: z.array(z.string().max(1000)).max(12).default([]),
});
export type SuggestionsRequest = z.infer<typeof SuggestionsRequest>;

/** Three built-in ideas; each round shows the next three, so ↻ New ideas changes them. */
export function builtInIdeas(words: SuggestionWords, round: number): string[] {
  const templates = enCA.suggestionTemplates;
  return Array.from({ length: IDEAS_PER_ROUND }, (_, i) => templates[(round * IDEAS_PER_ROUND + i) % templates.length]!(words));
}

/** 30 rounds per parent per hour: each live round is a paid AI call. */
export const suggestionsLimiter = createRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 });

export type SuggestDeps = {
  ai: MessageIdeas;
  limiter: RateLimiter;
  /** THIS parent's friends' children among these ids (one per family, Q4 default). */
  friendsChildren(ownerId: string, friendIds: readonly string[]): Promise<string[]>;
  /** Error codes only, never the plan (CLAUDE.md "Logging"). */
  log?: (code: string) => void;
};

export type SuggestResult = { ok: true; ideas: string[]; source: "ai" | "built_in" } | { ok: false; code: "TOO_MANY_REQUESTS"; retryAfterSeconds: number };

export async function suggestMessages(deps: SuggestDeps, parent: { id: string; childFirstName: string }, request: SuggestionsRequest): Promise<SuggestResult> {
  const attempt = deps.limiter.hit(parent.id);
  if (!attempt.ok) return { ok: false, code: "TOO_MANY_REQUESTS", retryAfterSeconds: attempt.retryAfterSeconds };

  const zone = zoneOrDefault(request.zone);
  const start = wallTime(request.day, request.startTime, zone);
  const end = wallTime(request.day, request.endTime, zone);
  const timed = start && end && end > start ? { day: formatShortDay(start, zone), time: formatTimeRange(start, end, zone) } : null;
  const placeName = request.placeName.trim() || null;

  try {
    const ideas = await deps.ai.messageIdeas({
      day: timed?.day ?? null,
      time: timed?.time ?? null,
      placeName,
      families: request.friendIds.length,
      avoid: request.avoid,
    });
    return { ok: true, ideas, source: "ai" };
  } catch (error) {
    deps.log?.(error instanceof Error && error.message.startsWith("fake AI") ? "ai_fake" : "ai_failed");
  }

  const kids = request.friendIds.length ? await deps.friendsChildren(parent.id, request.friendIds) : [];
  const w = enCA.suggestionWords;
  const words: SuggestionWords = {
    child: parent.childFirstName,
    kids: kids.length ? joinNames(kids) : w.noKids,
    all: kids.length ? joinNames([parent.childFirstName, ...kids]) : w.allWithoutKids(parent.childFirstName),
    when: timed ? w.when(timed.day, timed.time) : w.noTime,
    at: placeName ? w.at(placeName) : "",
  };
  return { ok: true, ideas: builtInIdeas(words, request.round), source: "built_in" };
}
