import { z } from "zod";

// The variables the app needs today. Later tasks add theirs here and in .env.example.
// Browser-visible: NEXT_PUBLIC_* only. Everything else is read on the server and never reaches a client bundle.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Key for the HMAC of phone numbers (profiles.phone_hash, friends.phone_hash): 32 random bytes, e.g. `openssl rand -hex 32`. */
  PHONE_HASH_KEY: z.string().min(32),
  /** Where invite links point: `${PUBLIC_LINK_BASE}/r/<token>` (Q16 default: the Railway domain). No trailing slash. */
  PUBLIC_LINK_BASE: z.url().transform((url) => url.replace(/\/+$/, "")),
  /** `fake` (tests, phone sessions, no key) or `live` (Anthropic). Live without a key falls back to the built-in suggestions. */
  AI_MODE: z.enum(["fake", "live"]).default("fake"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  /** `fake` (tests, phone sessions, no key) or `live` (Google Places, Q6 default). Live without a key falls back to the fake places. */
  PLACES_MODE: z.enum(["fake", "live"]).default("fake"),
  PLACES_API_KEY: z.string().optional().transform((v) => v || undefined),
  /** The cron service sends `Authorization: Bearer $CRON_SECRET` to /api/cron/tick. Unset = the tick refuses every call. */
  CRON_SECRET: z.string().optional().transform((v) => v || undefined).pipe(z.string().min(32).optional()),
  /** Optional curtain for staging and demos (src/lib/gate). Unset or empty = no curtain. */
  SITE_PASSWORD: z.string().optional().transform((v) => v || undefined).pipe(z.string().min(8).optional()),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    // Names of the bad variables only, never their values.
    const names = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment: ${names}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
