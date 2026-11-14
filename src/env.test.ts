import { describe, expect, it } from "vitest";
import { parseEnv } from "@/env";

describe("parseEnv", () => {
  it("defaults NODE_ENV to development", () => {
    expect(parseEnv({}).NODE_ENV).toBe("development");
  });

  it("fails fast and names the bad variable, not its value", () => {
    expect(() => parseEnv({ NODE_ENV: "secret-value" })).toThrow(/NODE_ENV/);
    expect(() => parseEnv({ NODE_ENV: "secret-value" })).not.toThrow(/secret-value/);
  });
});
