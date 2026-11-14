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
