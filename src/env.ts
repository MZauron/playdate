import { z } from "zod";

// Only the variables the app needs today. Later tasks add theirs here and in .env.example.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
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
