import { describe, expect, it } from "vitest";
import { parseEnv } from "@/env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54521",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  PHONE_HASH_KEY: "k".repeat(32),
  PUBLIC_LINK_BASE: "https://kindred.test",
};

describe("parseEnv", () => {
  it("defaults NODE_ENV to development", () => {
    expect(parseEnv(valid).NODE_ENV).toBe("development");
  });

  it("fails fast and names the bad variable, not its value", () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: "secret-value" })).toThrow(/NODE_ENV/);
    expect(() => parseEnv({ ...valid, NODE_ENV: "secret-value" })).not.toThrow(/secret-value/);
  });

  it("names every missing variable", () => {
    expect(() => parseEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL.*NEXT_PUBLIC_SUPABASE_ANON_KEY.*SUPABASE_SERVICE_ROLE_KEY.*PHONE_HASH_KEY.*PUBLIC_LINK_BASE/);
  });

  it("refuses a phone hash key shorter than 32 characters, without printing it", () => {
    const short = "short-key-value";
    expect(() => parseEnv({ ...valid, PHONE_HASH_KEY: short })).toThrow(/PHONE_HASH_KEY/);
    expect(() => parseEnv({ ...valid, PHONE_HASH_KEY: short })).not.toThrow(new RegExp(short));
  });

  it("drops a trailing slash from the link base and defaults the AI to the built-in suggestions", () => {
    const env = parseEnv({ ...valid, PUBLIC_LINK_BASE: "https://kindred.test/" });
    expect(env.PUBLIC_LINK_BASE).toBe("https://kindred.test");
    expect(env.AI_MODE).toBe("fake");
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("treats an empty SITE_PASSWORD as no curtain and refuses one shorter than 8 characters", () => {
    expect(parseEnv({ ...valid, SITE_PASSWORD: "" }).SITE_PASSWORD).toBeUndefined();
    expect(parseEnv({ ...valid, SITE_PASSWORD: "long-enough" }).SITE_PASSWORD).toBe("long-enough");
    expect(() => parseEnv({ ...valid, SITE_PASSWORD: "short" })).toThrow(/SITE_PASSWORD/);
  });
});
