// Needs no database: every check in docs/schema.test.sql has a test of the same name in schema.test.ts, and the reverse.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const sqlLabels = [...readFileSync(path.join(root, "docs/schema.test.sql"), "utf8").matchAll(/^select expect_(?:error|count)\(.*,'([^']+)'\);$/gm)].map((m) => m[1]!);
const testNames = [...readFileSync(path.join(import.meta.dirname, "schema.test.ts"), "utf8").matchAll(/\bit\(\s*"([^"]+)"/g)].map((m) => m[1]!);

describe("docs/schema.test.sql ↔ supabase/tests/schema.test.ts", () => {
  it("finds the 46 checks", () => {
    expect(sqlLabels).toHaveLength(46);
  });
  it("every check has a test", () => {
    expect(sqlLabels.filter((l) => !testNames.includes(l))).toEqual([]);
  });
  it("every test is a check", () => {
    expect(testNames.filter((n) => !sqlLabels.includes(n))).toEqual([]);
  });
});
